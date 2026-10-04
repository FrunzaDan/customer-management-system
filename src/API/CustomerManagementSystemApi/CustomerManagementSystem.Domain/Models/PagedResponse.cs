namespace CustomerManagementSystem.Domain.Models;

public sealed class PagedResponse<T>(IReadOnlyList<T> items, int totalItems, int pageNumber, int pageSize)
{
    public int PageNumber { get; } = pageNumber;

    public int PageSize { get; } = pageSize;

    public int TotalItems { get; } = totalItems;

    public IReadOnlyList<T> Items { get; } = items;
}
