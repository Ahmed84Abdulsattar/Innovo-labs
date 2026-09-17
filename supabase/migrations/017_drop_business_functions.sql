-- Remove business_functions column — redundant with departments field.
ALTER TABLE initiatives_board DROP COLUMN IF EXISTS business_functions;
