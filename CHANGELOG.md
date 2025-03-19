# bedrock-tokenizer ChangeLog

## 11.0.0 - 2025-03-xx

### Changed
- Update dependencies.
  - **BREAKING**: `@digitalbazaar/webkms-client@14`.
- Update peer dependencies.
  - `@bedrock/core@6.3.0`.
  - `@bedrock/https-agent@4.1.0`.
  - **BREAKING**: `@bedrock/mongodb@11`.
    - Use MongoDB driver 6.x and update error names and details.
    - See changelog for details.
- Update dev dependencies.
- Update test dependencies.

## 10.0.1 - 2025-03-04

### Fixed
- Use `result.modifiedCount` to enable newer mongodb driver.
- Remove unused `background` option from mongodb index creation.

## 10.0.0 - 2023-09-15

### Changed
- **BREAKING**: Drop support for Node.js < 18.
- Use `@digitalbazaar/webkms-client@13`. This version requires Node.js 18+.

## 9.3.0 - 2022-12-06

### Changed
- Do not use `referenceId` when creating keystore.

## 9.2.0 - 2022-11-13

### Changed
- Update dev mode meter to work with `@bedrock/meter@5`.

## 9.1.0 - 2022-08-02

### Changed
- Update to `@digitalbazaar/webkms-client@12`; should be no
  external changes.

## 9.0.1 - 2022-08-01

### Fixed
- Removed unnecessary dependency `assert-plus`.

## 9.0.0 - 2022-08-01

### Changed
- **BREAKING**: Require Node.js >=16.
- Update dependencies.
- **BREAKING**: Update peer dependencies.
  - `@bedrock/app-identity@4`
- Use `package.json` `files` field.
- Test on Node.js 18.x.
- Lint module.

## 8.0.0 - 2022-04-29

### Changed
- **BREAKING**: Update peer deps:
  - `@bedrock/core@6`
  - `@bedrock/app-identity@3`
  - `@bedrock/https-agent@4`
  - `@bedrock/mongodb@10`.

## 7.0.0 - 2022-04-21

### Changed
- **BREAKING**: Rename package to `@bedrock/tokenizer`.
- **BREAKING**: Convert to module (ESM).
- **BREAKING**: Remove default export.
- **BREAKING**: Require node 14.x.
- **BREAKING**: `setAutoRotationChecker` takes the named parameter `method`
  now instead of being unnamed.
- **BREAKING**: Improve errors and error causes when getting the current
  tokenizer.
- Add logging of various tokenizer creation / rotation errors.

## 6.0.0 - 2022-03-17

### Changed
- **BREAKING**: Locally hash values prior to sending them to
  the WebKMS system to increase privacy and limit payload size.

## 5.1.0 - 2022-03-12

### Changed
- Allow auto-rotation to be disabled by setting auto-rotation
  checker to `null`. This could be previously done by setting
  a function that returned `false`, but setting `null` allows
  original state to be restored and avoids other internal calls.

### Fixed
- Ensure `CACHED_TOKENIZER` is evicted when tokenizer rotation occurs.

## 5.0.0 - 2022-03-12

### Changed
- **BREAKING**: Remove usage of deprecated `database.writeOptions`.
- Code clean-up.

## 4.0.0 - 2022-03-01

### Changed
- **BREAKING**: Use `@digitalbazaar/webkms-client@10`.

## 3.0.0 - 2022-01-14

### Changed
- **BREAKING**: Use `@digitalbazaar/webkms-client@9`.

## 2.2.0 - 2021-11-04

### Added
- Added optional `explain` param to get more details about database performance.
- Added database tests in order to check database performance.

### Changed
- Exposed helper functions in order to properly test database calls.

## 2.1.0 - 2021-09-20

### Changed
- `tokenizer.kms.meterId` now defaults to use the mock meter id provided by
  `bedrock-meter`.

## 2.0.0 - 2021-09-09

### Added
- **BREAKING**: The tokenizer now requires a `meterId` configured using
  `config.tokenizer.kms.meterId`. The meter must be created before the tokenizer
  can be used. The meter's controller must be the `app` identity per
  `bedrock-app-identity`.

### Changed
- **BREAKING**: `Hmac.sign()` will now return a `Uint8Array`.
- **BREAKING**: Configuration of the kms is now under a `kms` namespace in the
  config. The `config.tokenizer.kmsModule` configuration is now
  `config.tokenizer.kms.defaultKmsModule`. The `config.tokenizer.kmsBaseUrl`
  configuration is now `config.tokenizer.kms.baseUrl`.

## 1.1.0 - 2020-10-08

### Changed
- Update peer and test deps.

## 1.0.0 - 2020-08-20

### Added
- Added core files.
- See git history for changes.
