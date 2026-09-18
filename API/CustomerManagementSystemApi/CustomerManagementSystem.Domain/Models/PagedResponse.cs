namespace CustomerManagementSystem.Domain.Models;

public class PagedResponse<T>(IEnumerable<T> items, int totalItems, int pageNumber, int pageSize)
{
    public int PageNumber { get; set; } = pageNumber;

    public int PageSize { get; set; } = pageSize;

    public int TotalItems { get; set; } = totalItems;

    public IEnumerable<T> Items { get; set; } = items;
}
