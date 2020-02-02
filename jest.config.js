const path = require('path')

module.exports = {
  roots: [path.join(__dirname, './src')],
  rootDir: path.join(__dirname, '.'),
  testEnvironment: 'node',
  testMatch: ['**/__tests__/resolvers.js'],
  moduleDirectories: ['node_modules', __dirname, path.join(__dirname, './src')],
  coverageDirectory: path.join(__dirname, './coverage/'),
  collectCoverageFrom: ['**/src/**/*.js'],
  coveragePathIgnorePatterns: ['.*/__tests__/.*'],
  // globalSetup: './test/setup.js',
  // globalTeardown: './test/teardown.js',
  watchPlugins: [
    require.resolve('jest-watch-select-projects'),
    require.resolve('jest-watch-typeahead/filename'),
    require.resolve('jest-watch-typeahead/testname')
  ]
}
