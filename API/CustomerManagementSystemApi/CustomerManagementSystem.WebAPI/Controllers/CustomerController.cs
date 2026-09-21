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

    [HttpGet("products")]
    public async Task<IActionResult> GetProducts(CancellationToken cancellationToken)
    {
        var response = await customerService.GetProducts(cancellationToken);
        return StatusCode(response.Status ?? 200, response);
    }

    [HttpGet("productDetails")]
    public async Task<IActionResult> GetProductDetails([FromQuery] string productGuid,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(productGuid))
            return BadRequest(new { Message = "Product GUID cannot be null or empty." });

        var response = await customerService.GetProductDetails(productGuid, cancellationToken);
        return StatusCode(response.Status ?? 200, response);
    }

    [HttpGet("purchases")]
    public async Task<IActionResult> GetCustomerPurchases([FromQuery] string customerGuid,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(customerGuid))
            return BadRequest(new { Message = "Customer GUID cannot be null or empty." });

        var response = await customerService.GetCustomerPurchases(customerGuid, cancellationToken);
        return StatusCode(response.Status ?? 200, response);
    }

    [HttpPost("purchase")]
    public async Task<IActionResult> PurchaseProduct([FromQuery] string customerGuid, [FromQuery] string productGuid,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(customerGuid))
            return BadRequest(new { Message = "Customer GUID cannot be null or empty." });

        if (string.IsNullOrEmpty(productGuid))
            return BadRequest(new { Message = "Product GUID cannot be null or empty." });

        var response = await customerService.PurchaseProduct(customerGuid, productGuid, MerchantId, cancellationToken);
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

    // Explicit role check (not just the class-level [Authorize]) on top of a destructive,
    // untargeted action — wipes every audit row for every customer in one call. Today this
    // is a no-op in practice (1801 is the only merchant_role that exists), but it stops a
    // future second role from silently inheriting access to this action.
    [Authorize(Roles = "1801")]
    [HttpDelete("auditLog/all")]
    public async Task<IActionResult> DeleteAllCustomerAuditLog(CancellationToken cancellationToken)
    {
        var response = await customerService.DeleteAllCustomerAuditLog(cancellationToken);
        return StatusCode(response.Status ?? 200, response);
    }
}
