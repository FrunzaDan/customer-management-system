namespace CustomerManagementSystem.Domain.Models;

// Feeds the Charts tab's time-series charts. Both lists are ascending by YearMonth
// ("yyyy-MM") and only contain months that actually have at least one row — there's
// no zero-filling for months with no activity, that's a UI concern.
public sealed record MonthlyActivityModel
{
    public required IReadOnlyList<MonthlyCountModel> CustomerCreations { get; init; }

    public required IReadOnlyList<MonthlyCountModel> ProductPurchases { get; init; }
}

public sealed record MonthlyCountModel
{
    // ISO 8601 year-month, "yyyy-MM" — formatted by DbHelper from the DATE the proc returns.
    public required string YearMonth { get; init; }

    public required int Count { get; init; }
}
