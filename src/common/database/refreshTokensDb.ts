import { Db, ObjectId } from 'mongodb';
import { Roles } from '../../models/roles';
import { Tokens } from '../../models/tokens';
import { COLLECTION_REFRESH_TOKENS, REFRESH_TOKEN_TIMEOUT } from '../config';
import { BadRequestError } from '../errors/bad-request';
import { UnauthorizedError } from '../errors/unauthorized';
import { createJwtToken } from '../jwt-utils';
import { getIdProjection } from '../mongo-utils';

export class RefreshTokensDb {
  private readonly db: Db;

  public constructor(db: Db) {
    this.db = db;
  }

  public async createNewRefreshToken(userId: string, ipAddress: string): Promise<string> {
    const doc: Tokens.CreateRequest = {
      userId,
      createdByIp: ipAddress,
      expires: new Date(Date.now() + REFRESH_TOKEN_TIMEOUT),
    };

    const collection = this.db.collection(COLLECTION_REFRESH_TOKENS);
    const result = await collection.insertOne(doc);
    if (!result.result.ok) {
      throw new Error('Failed to create new refresh token');
    }
    return result.insertedId;
  }

  public async getToken(id: string): Promise<Tokens.RefreshToken> {
    const collection = this.db.collection(COLLECTION_REFRESH_TOKENS);
    const token = await collection.findOne<Tokens.RefreshToken>(
      {
        _id: new ObjectId(id),
      },
      {
        projection: {
          id: { $convert: { input: '$_id', to: 'string' } },
          userId: 1,
          createdByIp: 1,
          revokedDate: 1,
          revokedByIp: 1,
          replacedByTokenId: 1,
          expires: 1,
          _id: 0,
        },
      },
    );
    if (!token) {
      throw new BadRequestError('Refresh token not found', id);
    }
    const isExpired = Date.now() >= token.expires.getTime();
    if (isExpired || token.revokedDate) {
      throw new UnauthorizedError('Token expired', id);
    }
    return token;
  }

  public async getTokens(userId: string): Promise<Tokens.RefreshToken[]> {
    const collection = this.db.collection(COLLECTION_REFRESH_TOKENS);

    const tokens = collection.find<Tokens.RefreshToken>(
      { userId },
      {
        projection: {
          ...getIdProjection(),
        },
      },
    );
    return await tokens.toArray();
  }

  public async refreshToken(
    id: string,
    ipAddress: string,
    roles: Roles.Type[],
  ): Promise<Tokens.TokenResponse> {
    const collection = this.db.collection(COLLECTION_REFRESH_TOKENS);
    const currentToken = await this.getToken(id);
    const newRefreshTokenId = await this.createNewRefreshToken(currentToken.userId, ipAddress);

    const updateDoc: Tokens.ReplaceRevokeUpdate = {
      revokedDate: new Date(),
      revokedByIp: ipAddress,
      replacedByTokenId: newRefreshTokenId,
    };
    // TODO make sure there is no need for error handling
    await collection.updateOne(
      {
        _id: new ObjectId(currentToken.id),
      },
      {
        $set: updateDoc,
      },
    );

    const newJwtToken = createJwtToken(currentToken.userId, roles);

    return { refreshToken: newRefreshTokenId, token: newJwtToken };
  }

  public async revokeToken(id: string, ipAddress: string): Promise<void> {
    const collection = this.db.collection(COLLECTION_REFRESH_TOKENS);
    const updateDoc: Tokens.RevokeUpdate = {
      revokedByIp: ipAddress,
      revokedDate: new Date(),
    };
    await collection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: updateDoc,
      },
    );
  }
}
