using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Contracts;

public sealed class CreateCustomerRequest
{
    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Email { get; set; }

    public Gender? Gender { get; set; }

    public DateOnly? BirthDate { get; set; }

    public DateOnly? EnrollmentDate { get; set; }

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

    public DateOnly? EnrollmentDate { get; set; }

    public AddressRequest? Address { get; set; }
}

public sealed class AddressRequest
{
    public string? Country { get; set; }
    public string? County { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
    public string? Street { get; set; }
    public string? StreetNumber { get; set; }
}
