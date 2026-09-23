namespace CustomerManagementSystem.Domain.Models;

// Feeds the Charts tab's time-series charts. Both lists are ascending by YearMonth
// ("yyyy-MM") and only contain months that actually have at least one row — there's
// no zero-filling for months with no activity, that's a UI concern.
public class MonthlyActivityModel
{
    public List<MonthlyCountModel> CustomerRegistrations { get; set; } = [];

    public List<MonthlyCountModel> ProductPurchases { get; set; } = [];
}

public class MonthlyCountModel
{
    // "yyyy-MM".
    public string? YearMonth { get; set; }

    public int Count { get; set; }
}
