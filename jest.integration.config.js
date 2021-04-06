module.exports =  {
    testEnvironment: "node",
    verbose: true,
    preset: 'ts-jest',
    globals: {
        'ts-jest': {
          tsconfig: '<rootDir>/tsconfig.json',
        },
        
    },
    globalSetup: "<rootDir>/src/test/integration-setup.ts",
    globalTeardown: "<rootDir>/src/test/integration-teardown.ts",
}