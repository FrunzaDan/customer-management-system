namespace CustomerManagementSystem.Domain.Models;

public sealed record CustomerInsightsModel
{
    public required IReadOnlyList<CustomerProfileModel> Customers { get; init; }

    public required IReadOnlyList<MonthlySalesModel> MonthlySales { get; init; }
}

public sealed record CustomerProfileModel
{
    public required CustomerStatus Status { get; init; }

    public required Gender Gender { get; init; }

    public DateOnly? BirthDate { get; init; }

    public required DateOnly EnrollmentDate { get; init; }

    public required string County { get; init; }

    public required int PurchaseCount { get; init; }
}

public sealed record MonthlySalesModel
{
    public required string YearMonth { get; init; }

    public required int PurchaseCount { get; init; }

    public required decimal Revenue { get; init; }
}
