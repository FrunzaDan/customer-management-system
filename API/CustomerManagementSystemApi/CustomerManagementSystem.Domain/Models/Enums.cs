using System.Text.Json.Serialization;

namespace CustomerManagementSystem.Domain.Models;

// Customer.Gender (TINYINT, CK_Customer_Gender). Serialized as its number.
public enum Gender : byte
{
    NotDeclared = 0,
    Male = 1,
    Female = 2
}

// Customer.StatusCode (SMALLINT, CK_Customer_StatusCode) — see
// ai_docs/database.md. Serialized as its number, the documented status code.
public enum CustomerStatus : short
{
    Active = 1901,
    Deactivated = 1903,
    Test = 1904
}

// Merchant.RoleCode (SMALLINT). The number is also the JWT role claim value
// that [Authorize(Roles = "1801")] checks.
public enum MerchantRole : short
{
    Merchant = 1801
}

// CustomerAuditLog.ActionType (VARCHAR, CK_CustomerAuditLog_ActionType). Stored and
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

// Customer_List's @SortColumn/@SortDirection. Bound from the query string by name,
// case-insensitively ("name", "Email", ...).
public enum CustomerSortColumn
{
    Name,
    Email,
    PhoneNumber
}

public enum SortDirection
{
    Asc,
    Desc
}
