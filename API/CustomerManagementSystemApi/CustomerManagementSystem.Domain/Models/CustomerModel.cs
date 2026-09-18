namespace CustomerManagementSystem.Domain.Models;

public class CustomerModel
{
    public string? Guid { get; set; }

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? Msisdn { get; set; }

    public string? Email { get; set; }

    public int? CustomerStatus { get; set; }

    public string? CreationDate { get; set; }

    public string? InteractionDate { get; set; }

    public int? Gender { get; set; }

    public string? Birthdate { get; set; }

    public AddressModel? Address { get; set; }
}

public class GetCustomerRequest
{
    public int SearchOption { get; set; }
    public string? SearchVariable { get; set; }
}