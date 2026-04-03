# Spec: Waitlist Position Query Optimization

## ADDED Requirements

### Requirement: Efficient Waitlist Position Calculation

The system **MUST** calculate a user's position in the waitlist queue efficiently using database-level operations, not in-memory JavaScript processing.

#### Scenario: Get position for existing email

- **GIVEN** a waitlist with multiple entries
- **WHEN** `getWaitlistPosition` is called with an email that exists in the waitlist
- **THEN** it returns the correct 1-based position (1 = first in line)
- **AND** the query only transfers a single numeric result from the database

#### Scenario: Get position for non-existent email

- **GIVEN** a waitlist
- **WHEN** `getWaitlistPosition` is called with an email that doesn't exist
- **THEN** it returns `null`

#### Scenario: Position is correct regardless of insertion order

- **GIVEN** a waitlist with entries added at different times
- **WHEN** a user queries their position
- **THEN** the position correctly reflects how many people joined before them (based on `timestamp`)
