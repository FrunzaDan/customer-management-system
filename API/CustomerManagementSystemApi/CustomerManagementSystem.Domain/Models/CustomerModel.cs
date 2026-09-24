namespace CustomerManagementSystem.Domain.Models;

public sealed record CustomerModel
{
    public required Guid CustomerId { get; init; }

    public required string FirstName { get; init; }

    public required string LastName { get; init; }

    public required string PhoneNumber { get; init; }

    public required string Email { get; init; }

    public required CustomerStatus Status { get; init; }

    public required DateTime CreatedAt { get; init; }

    public required DateTime LastInteractionAt { get; init; }

    public required Gender Gender { get; init; }

    public DateOnly? BirthDate { get; init; }

    public required AddressModel Address { get; init; }
}

public sealed class CreateCustomerRequest
{
    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Email { get; set; }

    public Gender? Gender { get; set; }

    public DateOnly? BirthDate { get; set; }

    public CustomerStatus? Status { get; set; }

    public AddressRequest? Address { get; set; }
}

public sealed class UpdateCustomerRequest
{
    public Guid CustomerId { get; set; }

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Email { get; set; }

    public Gender? Gender { get; set; }

    public DateOnly? BirthDate { get; set; }

    public AddressRequest? Address { get; set; }
}

public sealed record CustomerLookup(Guid? CustomerId = null, string? PhoneNumber = null, string? Email = null);
