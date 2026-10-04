namespace CustomerManagementSystem.Domain.Models;

public class GetCustomersRequest
{
    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;

    public string? SearchTerm { get; set; }

    public CustomerSortColumn SortColumn { get; set; } = CustomerSortColumn.Name;

    public SortDirection SortDirection { get; set; } = SortDirection.Asc;
}

public class ExportCustomersRequest
{
    public string? SearchTerm { get; set; }

    public CustomerSortColumn SortColumn { get; set; } = CustomerSortColumn.Name;

    public SortDirection SortDirection { get; set; } = SortDirection.Asc;
}
