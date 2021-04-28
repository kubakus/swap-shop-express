import { ObjectId } from 'mongodb';
import { createTransport } from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import { Base } from '../models/base';
import { Events } from '../models/events';
import { ItemState } from '../models/item-state';
import { Offers } from '../models/offers';
import { Subscriptions } from '../models/subscriptions';
import { Wanted } from '../models/wanted';
import {
  AWS_ACCESS_KEY_ID,
  AWS_HOST,
  AWS_SECRET_ACCESS_KEY,
  EMAIL,
  EMAIL_PASSWORD,
  EMAIL_PORT,
  EMAIL_SERVICE,
} from './config';
import { Database } from './database';

const AWS_SETTINGS: AwsSettings | undefined =
  AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_HOST
    ? { host: AWS_HOST, user: AWS_ACCESS_KEY_ID, pass: AWS_SECRET_ACCESS_KEY }
    : undefined;

const EMAIL_SETTINGS: EmailSettings | undefined =
  EMAIL_PASSWORD && EMAIL_SERVICE && EMAIL
    ? { user: EMAIL, pass: EMAIL_PASSWORD, service: EMAIL_SERVICE }
    : undefined;

const DEFAULT_EMAIL_PORT = 465;
interface AwsSettings extends DefaultTransportSettings {
  host: string;
}
interface EmailSettings extends DefaultTransportSettings {
  service: string;
}

interface DefaultTransportSettings {
  host?: string;
  user: string;
  pass: string;
  service?: string;
}
export class EmailDispatcher {
  // eslint-disable-next-line no-undef
  private timeoutReference?: NodeJS.Timeout;

  // eslint-disable-next-line no-undef
  public get timeout(): NodeJS.Timeout | undefined {
    return this.timeoutReference;
  }

  public async createConfirmEmail(
    userEmail: string,
    userName: string,
    confirmationToken: string,
    uiUrl: string,
  ): Promise<void> {
    if (!EMAIL) {
      throw new Error('Missing swapshop email address. Email dispatcher disabled');
    }

    if (!AWS_SETTINGS || !EMAIL_SETTINGS) {
      throw new Error('Missing transport settings. Email dispatcher disabled');
    }

    const transport = this.createEmailTransport(AWS_SETTINGS || EMAIL_SETTINGS);

    await transport.sendMail({
      from: EMAIL,
      to: userEmail,
      subject: 'Email confirmation',
      html: `<h1>Email Confirmation</h1>
                <h2>Hello ${userName}!</h2>
                <p>Thank you for registering with SwapShop! Please confirm your email by clicking the link below. It will redirect you to the login page.</p>
                <a href=${uiUrl}/api/auth/confirm/${confirmationToken}>Click here to confirm your email.</a>
                </div>`,
    });
  }

  public async createDispatchTimeout(db: Database, subscriptionId: string): Promise<void> {
    if (!EMAIL_SETTINGS || !AWS_SETTINGS) {
      throw new Error('Missing transport settings. Email dispatcher disabled');
    }

    const req: Subscriptions.Request = {
      id: subscriptionId,
      state: Subscriptions.State.AWAITING_DISPATCH,
    };
    const subscription = (await db.subscriptionsDb.getSubscriptions(req))[0];

    if (!subscription) {
      throw new Error('Cannot create dispatch timeout. Subscription not found');
    }

    if (subscription.state !== Subscriptions.State.AWAITING_DISPATCH) {
      throw new Error('Only awaiting subscriptions can be dispatched');
    }

    // TODO should it be created if one is already awaiting?
    this.stopTimeout();
    const timeout = subscription.date.getTime() - Date.now();

    if (timeout < 0) {
      throw new Error('Dispatch must happen in the future');
    }

    this.timeoutReference = setTimeout(() => {
      this.dispatch(db, subscription).catch((err) => {
        console.error('Error occurred while dispatching emails', err);
        console.warn('Clearing timeout reference');
        this.stopTimeout();
        db.subscriptionsDb
          .updateSubscriptionState(
            subscription.id,
            subscription.updatedBy,
            Subscriptions.State.FAILED,
            err.message || err,
          )
          .catch((err) => console.error(err));
      });
    }, timeout);
  }

  public stopTimeout(): void {
    if (this.timeoutReference) {
      clearTimeout(this.timeoutReference);
      this.timeoutReference = undefined;
    }
  }

  private async dispatch(db: Database, subscription: Subscriptions.Subscription): Promise<void> {
    if (!EMAIL_SETTINGS || !AWS_SETTINGS) {
      throw new Error('Missing transport settings. Email dispatcher disabled');
    }

    if (!EMAIL) {
      throw new Error('Missing swapshop email address. Email dispatcher disabled');
    }
    console.info('Preparing emails for dispatch...');

    const req = { updatedDate: { before: subscription.date }, state: ItemState.APPROVED };
    const offered = await db.offersDb.getOffers(req);
    const wanted = await db.wantedDb.getWanted(req);
    const events = await db.eventsDb.getEvents(req);

    if (!(offered.length || wanted.length || events.length)) {
      throw new Error('Cannot dispatch empty subscription email');
    }

    const users = await db.usersDb.getUsers({ isVerified: true });

    if (users.length < 1) {
      throw new Error('Cannot create a subscription without any recipients');
    }

    const emails = users
      .filter((user) => user.email !== EMAIL)
      .map((filtered) => filtered.email)
      .join(',');

    const transport = this.createEmailTransport(AWS_SETTINGS || EMAIL_SETTINGS);

    const options: Mail.Options = {
      from: EMAIL,
      subject: 'Example Subject',
      to: `<${emails}>`,
      html: this.createEmailContent(
        offered,
        wanted,
        events,
        subscription.header,
        subscription.footer,
        true,
      ),
      text: this.createEmailContent(
        offered,
        wanted,
        events,
        subscription.header,
        subscription.footer,
      ),
    };

    await transport.sendMail(options);

    console.info('Dispatched');

    this.stopTimeout();
    try {
      await db.subscriptionsDb.updateSubscriptionState(
        subscription.id,
        subscription.updatedBy,
        Subscriptions.State.DISPATCHED,
      );
    } catch (e) {
      console.warn(
        'Subscription emails dispatch succeeded but db failed to update subscription state, ID',
        subscription.id,
        'Error:',
        e,
      );
    }

    const createQuery = <T extends Base.Record>(items: T[]): Record<string, unknown> => ({
      $or: [
        { _id: { $in: items.map((item) => new ObjectId(item.id)) } },
        { state: ItemState.REJECTED },
      ],
    });
    const deleteEvents = db.eventsDb.deleteEvents(createQuery(events));
    const deleteOffered = db.offersDb.deleteOffered(createQuery(offered));
    const deleteWanted = db.wantedDb.deleteWanted(createQuery(wanted));

    const result = await Promise.allSettled([
      deleteEvents,
      deleteOffered,
      deleteWanted,
    ]).then((values) => values.filter((value: any) => value.reason));

    if (result.length) {
      console.warn('Failed to delete some of the items', result);
    }
  }

  private createEmailContent(
    offered: Offers.Offer[],
    wanted: Wanted.Wanted[],
    events: Events.Event[],
    header: string,
    footer: string,
    html = false,
  ): string {
    const breakOfEmpty = html ? '<br>' : '';
    const createOffered = (item: Offers.Offer): string => {
      return `
      Offered: ${item.itemName}${breakOfEmpty}
      Info: ${item.info}${breakOfEmpty}
      The deal: ${item.deal}${breakOfEmpty}
      E-Mail: ${item.email}${breakOfEmpty}
      Name: ${item.userName}${breakOfEmpty}
      `;
    };

    const createWanted = (item: Wanted.Wanted): string => {
      return `
      Wanted: ${item.itemName}${breakOfEmpty}
      Info: ${item.info}${breakOfEmpty}
      The deal: ${item.deal}${breakOfEmpty}
      E-Mail: ${item.email}${breakOfEmpty}
      Name: ${item.userName}${breakOfEmpty}
      `;
    };

    const createEvent = (item: Events.Event): string => {
      return `
      Event: ${item.eventName}${breakOfEmpty}
      Info: ${item.info}${breakOfEmpty}
      When: ${item.when.toLocaleString()}${breakOfEmpty}
      E-Mail: ${item.email}${breakOfEmpty}
      Contact: ${item.contactInfo}${breakOfEmpty}
      `;
    };

    const sectionDivider = '===========================';

    const itemDivider = '---------------------------';

    const createSectionHeadline = (sectionTitle: string): string => {
      return `
      ${sectionDivider}${breakOfEmpty}
      ${sectionTitle}${breakOfEmpty}
      ${sectionDivider}${breakOfEmpty}${breakOfEmpty}
      `;
    };

    const createSection = <T>(
      sectionTitle: string,
      items: T[],
      itemCallback: (item: T) => string,
    ): string => {
      if (!items.length) {
        return '';
      }
      const sectionHeadline = createSectionHeadline(sectionTitle);
      const itemsList = items
        .map((item) => `${itemCallback(item)}${breakOfEmpty}`)
        .join(`${itemDivider}${breakOfEmpty}${breakOfEmpty}`);
      return `${sectionHeadline}${itemsList}`;
    };

    const replaceNewLineCharacter = (p: string) => p.replace(/\n/g, '<br>');

    const offeredSection = createSection<Offers.Offer>('OFFERED', offered, createOffered);
    const wantedSection = createSection<Wanted.Wanted>('WANTED', wanted, createWanted);
    const eventsSection = createSection<Events.Event>('EVENTS', events, createEvent);

    const endOfLine = html ? '<br>' : '\n';

    const content = `${endOfLine}${endOfLine}${offeredSection}${endOfLine}${wantedSection}${endOfLine}${eventsSection}${endOfLine}`;

    const htmlResult = `<html>${replaceNewLineCharacter(header)}${content}${replaceNewLineCharacter(
      footer,
    )}</html>`;
    const textResult = `${header}${content}${footer}`;

    return html ? htmlResult : textResult;
  }

  private createEmailTransport(options?: DefaultTransportSettings): Mail {
    if (!options) {
      throw new Error('Cannot create transport without settings');
    }
    const port = EMAIL_PORT || DEFAULT_EMAIL_PORT;
    const transport = createTransport({
      port,
      host: options.host,
      secure: port === 465,
      service: options.service,
      auth: {
        user: options.user,
        pass: options.pass,
      },
    });
    return transport;
  }
}
