# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v3] - 2026-10-23

### Added

- Manual `performance-check` workflow for 10, 50 and 200 concurrent users (#8).
- Optional client-portal inputs for deployed end-to-end runs in `tests-ci.yml` (#8).

### Changed

- The backend, frontend and tests workflows audit all dependencies and fail on
  high-severity advisories (#8).

## [v2.0.0] - 2026-10-11

### Added

- Live Cloudinary integration check for the backend on push (#7).

## [v1] - 2026-09-28

### Added

- Reusable backend, frontend, tests and documents CI workflows.
