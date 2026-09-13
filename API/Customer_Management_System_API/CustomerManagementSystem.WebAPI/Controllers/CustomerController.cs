using System.Text;
using CustomerManagementSystem.BusinessLogic.Services;
using CustomerManagementSystem.Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CustomerManagementSystem.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomerController(ICustomerService customerService) : ControllerBase
{
    // Every [Authorize]-gated request has a verified JWT with ClaimTypes.Name set to the
    // merchant ID (see JwtCreation.BuildTokenDescriptor) — never null/empty in practice.
    private string MerchantId => User.Identity!.Name!;

    [HttpPost("register")]
    public async Task<IActionResult> RegisterCustomer([FromBody] CustomerModel customerRqst,
        CancellationToken cancellationToken)
    {
        var response = await customerService.RegisterCustomer(customerRqst, MerchantId, cancellationToken);
        return StatusCode(response.Status ?? 200, response);
    }

    [HttpGet("get")]
    public async Task<IActionResult> GetCustomer([FromQuery] string searchVariable,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(searchVariable))
            return BadRequest(new { Message = "Search variable cannot be null or empty." });

        var getCustomerRqst = new GetCustomerRequest
        {
            SearchVariable = searchVariable
        };
        var response = await customerService.GetCustomer(getCustomerRqst, cancellationToken);
        return StatusCode(response.Status ?? 200, response);
    }

    [HttpGet("all")]
    public async Task<IActionResult> GetCustomers([FromQuery] GetCustomersRequest request,
        CancellationToken cancellationToken)
    {
        var response = await customerService.GetCustomers(request, cancellationToken);
        return StatusCode(response.Status ?? 200, response);
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportCustomers([FromQuery] ExportCustomersRequest request,
        CancellationToken cancellationToken)
    {
        var response = await customerService.GetCustomersForExport(request, cancellationToken);
        if (response.Status != 200 || response.Data is not string csv)
            return StatusCode(response.Status ?? 200, response);

        var bytes = Encoding.UTF8.GetBytes(csv);
        return File(bytes, "text/csv", $"customers_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv");
    }

    [HttpGet("auditLog")]
    public async Task<IActionResult> GetCustomerAuditLog([FromQuery] string customerGuid,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(customerGuid))
            return BadRequest(new { Message = "Customer GUID cannot be null or empty." });

        var response = await customerService.GetCustomerAuditLog(customerGuid, cancellationToken);
        return StatusCode(response.Status ?? 200, response);
    }

    [HttpGet("auditLog/all")]
    public async Task<IActionResult> GetAllCustomerAuditLog([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var response = await customerService.GetAllCustomerAuditLog(pageNumber, pageSize, cancellationToken);
        return StatusCode(response.Status ?? 200, response);
    }

    [HttpPatch("edit")]
    public async Task<IActionResult> EditCustomer([FromBody] CustomerModel editCustomerRqst,
        CancellationToken cancellationToken)
    {
        var response = await customerService.EditCustomer(editCustomerRqst, MerchantId, cancellationToken);
        return StatusCode(response.Status ?? 200, response);
    }

    [HttpPatch("deactivate")]
    public async Task<IActionResult> DeactivateCustomer([FromQuery] string customerGuid,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(customerGuid))
            return BadRequest(new { Message = "Customer GUID cannot be null or empty." });

        var response = await customerService.DeactivateCustomer(customerGuid, MerchantId, cancellationToken);
        return StatusCode(response.Status ?? 200, response);
    }

    [HttpPatch("reactivate")]
    public async Task<IActionResult> ReactivateCustomer([FromQuery] string customerGuid,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(customerGuid))
            return BadRequest(new { Message = "Customer GUID cannot be null or empty." });

        var response = await customerService.ReactivateCustomer(customerGuid, MerchantId, cancellationToken);
        return StatusCode(response.Status ?? 200, response);
    }

    [HttpDelete("delete")]
    public async Task<IActionResult> DeleteCustomer([FromQuery] string customerGuid,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(customerGuid))
            return BadRequest(new { Message = "Customer GUID cannot be null or empty." });

        var response = await customerService.DeleteCustomer(customerGuid, MerchantId, cancellationToken);
        return StatusCode(response.Status ?? 200, response);
    }

    [HttpDelete("auditLog/all")]
    public async Task<IActionResult> DeleteAllCustomerAuditLog(CancellationToken cancellationToken)
    {
        var response = await customerService.DeleteAllCustomerAuditLog(cancellationToken);
        return StatusCode(response.Status ?? 200, response);
    }
}
