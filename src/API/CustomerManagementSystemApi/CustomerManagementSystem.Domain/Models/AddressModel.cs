namespace CustomerManagementSystem.Domain.Models;

public sealed record AddressModel
{
    public required string Country { get; init; }
    public required string County { get; init; }
    public required string City { get; init; }
    public required string PostalCode { get; init; }
    public required string Street { get; init; }
    public required string StreetNumber { get; init; }
}
