namespace CustomerManagementSystem.Domain.Models;

public class GetCustomersRequest
{
    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;

    public string? SearchTerm { get; set; }

    public string SortColumn { get; set; } = "name";

    public string SortDirection { get; set; } = "asc";
}

public class ExportCustomersRequest
{
    public string? SearchTerm { get; set; }

    public string SortColumn { get; set; } = "name";

    public string SortDirection { get; set; } = "asc";
}
