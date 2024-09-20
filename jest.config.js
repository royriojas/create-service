let coverageReporters = ['json'];

if (process.env.DEPLOY_ENV === 'local') {
  coverageReporters = [...coverageReporters, 'lcov'];
}

module.exports = {
  bail: true,
  moduleFileExtensions: ['js', 'jsx', 'json', 'ts', 'tsx'],
  roots: ['<rootDir>/'],
  moduleDirectories: ['node_modules'],
  testPathIgnorePatterns: ['dist'],
  testRegex: '/__(tests|specs)__/.*.([\\.test\\.spec])\\.(ts|tsx|js|jsx)$',
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.(ts|tsx)'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters,
};
