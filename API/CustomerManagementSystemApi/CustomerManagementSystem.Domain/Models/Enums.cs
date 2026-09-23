using System.Text.Json.Serialization;

namespace CustomerManagementSystem.Domain.Models;

// tbl_customers.gender (TINYINT, CK_tbl_customers_gender). Serialized as its number.
public enum Gender : byte
{
    NotDeclared = 0,
    Male = 1,
    Female = 2
}

// tbl_customers.customer_Status (SMALLINT, CK_tbl_customers_customer_Status) — see
// ai_docs/database.md. Serialized as its number, the documented status code.
public enum CustomerStatus : short
{
    Active = 1901,
    Deactivated = 1903,
    Test = 1904
}

// tbl_merchants.merchant_role (SMALLINT). The number is also the JWT role claim value
// that [Authorize(Roles = "1801")] checks.
public enum MerchantRole : short
{
    Merchant = 1801
}

// tbl_customer_audit_log.action (VARCHAR, CK_tbl_customer_audit_log_action). Stored and
// serialized by name, so the DB rows and the JSON stay human-readable.
[JsonConverter(typeof(JsonStringEnumConverter<AuditAction>))]
public enum AuditAction
{
    Created,
    Edited,
    Deactivated,
    Reactivated,
    Deleted,
    Purchased
}

// usp_getCustomers' @SortColumn/@SortDirection. Bound from the query string by name,
// case-insensitively ("name", "Email", ...).
public enum CustomerSortColumn
{
    Name,
    Email,
    Msisdn
}

public enum SortDirection
{
    Asc,
    Desc
}
