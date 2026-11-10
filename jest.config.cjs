// One jest run with two environments:
//   - "client" tests run in jsdom (they render React components)
//   - "server" tests run in node (they boot the Express app + in-memory Mongo)
// `npm test` runs both.
module.exports = {
  projects: [
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/client/**/*.test.{js,jsx}'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      },
      transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
      }
    },
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/server/**/*.test.js'],
      transform: {
        '^.+\\.js$': 'babel-jest'
      }
    }
  ]
};
