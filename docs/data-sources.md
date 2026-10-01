# Host data sources

The seven host engines accept bounded JSON arguments through MCP. JSON is a structured program-readable format; CSV is a table that can be exported from spreadsheet/account software. No CSV importer, automatic account download or authenticated Airbnb API adapter is implemented here.

Use `mode:"provided"` with tool-specific `host_data`: timestamp `as_of`, IANA `timezone`, supported `currency`, caller-asserted `complete`, plus actual calendar nights, house rules, prices, review facts or staff availability as appropriate. The discovery schema and individual tool docs specify every field. Missing facts remain missing. Results do not copy the full input into provenance metadata.

The [example workflow](../examples/host-workflow.json) contains synthetic data deliberately supplied through the provided-data path. `_source:"provided"` identifies the path; it does not authenticate those facts or identify them as live Airbnb data. An absent explicit data path remains a marked demo. Never remove demo markers to suggest account connectivity.

An ordinary Airbnb account does not by itself provide partner API authorization. Airbnb documents [earnings CSV export](https://www.airbnb.com/help/article/3632) and [connecting integrated property-management software](https://www.airbnb.com/help/article/2346). A PMS manages accommodation operations; an authorized API lets software exchange scoped data. Earnings tables alone cannot supply every house rule, guest-message fact or cleaner schedule required by these engines.

For a future import, obtain an authorized export or provider sandbox, inspect its actual columns/fields, map timestamps/currency/states, reject malformed or duplicate records, and test consent/ownership/revocation and provider error paths. Scope messaging, booking and price writes separately with explicit approvals. No private account data was accessed for this implementation.
