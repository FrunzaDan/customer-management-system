using System.Text.Json.Serialization;

namespace CustomerManagementSystem.Domain.Models;

public enum Gender : byte
{
    NotDeclared = 0,
    Male = 1,
    Female = 2
}

public enum CustomerStatus : short
{
    Active = 1901,
    Deactivated = 1903,
    Test = 1904
}

public enum MerchantRole : short
{
    Merchant = 1801
}

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
