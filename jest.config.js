/** Jest: fórmula de cierre automático (misma que RutaAutoCompleter en la API). */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/.expo/'],
};
