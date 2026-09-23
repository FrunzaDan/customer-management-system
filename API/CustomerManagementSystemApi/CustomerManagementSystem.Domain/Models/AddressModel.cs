namespace CustomerManagementSystem.Domain.Models;

// Response shape: every CustomerAddress column is NOT NULL.
public sealed record AddressModel
{
    public required string Country { get; init; }
    public required string County { get; init; }
    public required string Town { get; init; }
    public required string Zip { get; init; }
    public required string Street { get; init; }
    public required string Number { get; init; }
}

// Request shape, shared by register (where AddressValidation requires every field) and edit
// (where an omitted field means "leave unchanged").
public sealed class AddressRequest
{
    public string? Country { get; set; }
    public string? County { get; set; }
    public string? Town { get; set; }
    public string? Zip { get; set; }
    public string? Street { get; set; }
    public string? Number { get; set; }
}
