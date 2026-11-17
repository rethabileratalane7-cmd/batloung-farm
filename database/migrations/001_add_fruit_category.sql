-- Apply once to databases created before fruit categories were added.
ALTER TABLE fruits
  ADD COLUMN category VARCHAR(60) NULL DEFAULT NULL AFTER description;
