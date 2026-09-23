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
    // merchant's username (see JwtCreation.BuildTokenDescriptor) — never null/empty in practice.
    private string Username => User.Identity!.Name!;

    // GUID query parameters are typed Guid: a malformed value is rejected by model binding
    // (400, via the InvalidModelStateResponseFactory in Program.cs), and a missing one binds
    // to Guid.Empty, which the business logic rejects with its own 400.

    [HttpPost("register")]
    public async Task<ActionResult<ResponseModel<Guid?>>> RegisterCustomer(
        [FromBody] CreateCustomerRequest request, CancellationToken cancellationToken) =>
        Reply(await customerService.RegisterCustomer(request, Username, cancellationToken));

    [HttpGet("get")]
    public async Task<ActionResult<ResponseModel<CustomerModel>>> GetCustomer([FromQuery] string? searchTerm,
        CancellationToken cancellationToken) =>
        Reply(await customerService.GetCustomer(searchTerm, cancellationToken));

    [HttpGet("all")]
    public async Task<ActionResult<ResponseModel<PagedResponse<CustomerModel>>>> GetCustomers(
        [FromQuery] GetCustomersRequest request, CancellationToken cancellationToken) =>
        Reply(await customerService.GetCustomers(request, cancellationToken));

    [HttpGet("export")]
    public async Task<IActionResult> ExportCustomers([FromQuery] ExportCustomersRequest request,
        CancellationToken cancellationToken)
    {
        var response = await customerService.GetCustomersForExport(request, cancellationToken);
        if (response is not { Status: 200, Data: { } csv })
            return Reply(response);

        var bytes = Encoding.UTF8.GetBytes(csv);
        return File(bytes, "text/csv", $"customers_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv");
    }

    [HttpGet("audit-log")]
    public async Task<ActionResult<ResponseModel<IReadOnlyList<AuditLogEntry>>>> GetCustomerAuditLog(
        [FromQuery] Guid customerId, CancellationToken cancellationToken) =>
        Reply(await customerService.GetCustomerAuditLog(customerId, cancellationToken));

    [HttpGet("audit-log/all")]
    public async Task<ActionResult<ResponseModel<PagedResponse<GlobalAuditLogEntry>>>> GetAllCustomerAuditLog(
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default) =>
        Reply(await customerService.GetAllCustomerAuditLog(pageNumber, pageSize, cancellationToken));

    [HttpPost("product")]
    public async Task<ActionResult<ResponseModel<Guid?>>> CreateProduct([FromBody] CreateProductRequest request,
        CancellationToken cancellationToken) =>
        Reply(await customerService.CreateProduct(request, cancellationToken));

    [HttpGet("products")]
    public async Task<ActionResult<ResponseModel<IReadOnlyList<ProductModel>>>> GetProducts(
        CancellationToken cancellationToken) =>
        Reply(await customerService.GetProducts(cancellationToken));

    [HttpGet("monthly-activity")]
    public async Task<ActionResult<ResponseModel<MonthlyActivityModel>>> GetMonthlyActivity(
        CancellationToken cancellationToken) =>
        Reply(await customerService.GetMonthlyActivity(cancellationToken));

    [HttpGet("product-details")]
    public async Task<ActionResult<ResponseModel<ProductDetailsModel>>> GetProductDetails(
        [FromQuery] Guid productId, CancellationToken cancellationToken) =>
        Reply(await customerService.GetProductDetails(productId, cancellationToken));

    [HttpGet("purchases")]
    public async Task<ActionResult<ResponseModel<IReadOnlyList<PurchaseModel>>>> GetCustomerPurchases(
        [FromQuery] Guid customerId, CancellationToken cancellationToken) =>
        Reply(await customerService.GetCustomerPurchases(customerId, cancellationToken));

    [HttpPost("purchase")]
    public async Task<ActionResult<ResponseModel<object>>> PurchaseProduct([FromQuery] Guid customerId,
        [FromQuery] Guid productId, CancellationToken cancellationToken) =>
        Reply(await customerService.PurchaseProduct(customerId, productId, Username, cancellationToken));

    [HttpPatch("edit")]
    public async Task<ActionResult<ResponseModel<object>>> EditCustomer([FromBody] UpdateCustomerRequest request,
        CancellationToken cancellationToken) =>
        Reply(await customerService.EditCustomer(request, Username, cancellationToken));

    [HttpPatch("deactivate")]
    public async Task<ActionResult<ResponseModel<object>>> DeactivateCustomer([FromQuery] Guid customerId,
        CancellationToken cancellationToken) =>
        Reply(await customerService.DeactivateCustomer(customerId, Username, cancellationToken));

    [HttpPatch("reactivate")]
    public async Task<ActionResult<ResponseModel<object>>> ReactivateCustomer([FromQuery] Guid customerId,
        CancellationToken cancellationToken) =>
        Reply(await customerService.ReactivateCustomer(customerId, Username, cancellationToken));

    [HttpDelete("delete")]
    public async Task<ActionResult<ResponseModel<object>>> DeleteCustomer([FromQuery] Guid customerId,
        CancellationToken cancellationToken) =>
        Reply(await customerService.DeleteCustomer(customerId, Username, cancellationToken));

    // Explicit role check (not just the class-level [Authorize]) on top of a destructive,
    // untargeted action — wipes every audit row for every customer in one call. Today this
    // is a no-op in practice (1801 is the only Merchant.RoleCode that exists), but it stops a
    // future second role from silently inheriting access to this action.
    [Authorize(Roles = "1801")]
    [HttpDelete("audit-log/all")]
    public async Task<ActionResult<ResponseModel<object>>> DeleteAllCustomerAuditLog(
        CancellationToken cancellationToken) =>
        Reply(await customerService.DeleteAllCustomerAuditLog(cancellationToken));

    // The envelope's Status is the HTTP status to reply with.
    private ObjectResult Reply<T>(ResponseModel<T> response) => StatusCode(response.Status, response);
}
