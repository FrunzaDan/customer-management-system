namespace CustomerManagementSystem.Domain.Models;

public sealed record CustomerModel
{
    public required Guid CustomerId { get; init; }

    public required string FirstName { get; init; }

    public required string LastName { get; init; }

    public required string PhoneNumber { get; init; }

    public required string Email { get; init; }

    public required CustomerStatus Status { get; init; }

    public required DateOnly EnrollmentDate { get; init; }

    public required DateTime AccountCreatedAt { get; init; }

    public required DateTime LastInteractionAt { get; init; }

    public required Gender Gender { get; init; }

    public DateOnly? BirthDate { get; init; }

    public required AddressModel Address { get; init; }
}
