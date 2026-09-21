-- An SSDT project allows exactly one post-deployment script, so this is the single
-- entry point; each seed lives in its own file and is pulled in with :r at build time.
:r ./post_deployment_populate_tbl_merchants.sql
:r ./post_deployment_populate_tbl_products.sql
