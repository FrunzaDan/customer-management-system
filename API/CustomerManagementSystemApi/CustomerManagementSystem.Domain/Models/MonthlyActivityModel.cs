namespace CustomerManagementSystem.Domain.Models;

public sealed record MonthlyActivityModel
{
    public required IReadOnlyList<MonthlyCountModel> CustomerCreations { get; init; }

    public required IReadOnlyList<MonthlyCountModel> ProductPurchases { get; init; }
}

public sealed record MonthlyCountModel
{
    public required string YearMonth { get; init; }

    public required int Count { get; init; }
}
