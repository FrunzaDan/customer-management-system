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

    // GUID query parameters are typed Guid: a malformed value is rejected by model binding
    // (400, via the InvalidModelStateResponseFactory in Program.cs), and a missing one binds
    // to Guid.Empty, which the business logic rejects with its own 400.

    [HttpPost("register")]
    public async Task<ActionResult<ResponseModel<Guid?>>> RegisterCustomer(
        [FromBody] CreateCustomerRequest request, CancellationToken cancellationToken) =>
        Reply(await customerService.RegisterCustomer(request, MerchantId, cancellationToken));

    [HttpGet("get")]
    public async Task<ActionResult<ResponseModel<CustomerModel>>> GetCustomer([FromQuery] string? searchVariable,
        CancellationToken cancellationToken) =>
        Reply(await customerService.GetCustomer(searchVariable, cancellationToken));

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

    [HttpGet("auditLog")]
    public async Task<ActionResult<ResponseModel<IReadOnlyList<AuditLogEntry>>>> GetCustomerAuditLog(
        [FromQuery] Guid customerGuid, CancellationToken cancellationToken) =>
        Reply(await customerService.GetCustomerAuditLog(customerGuid, cancellationToken));

    [HttpGet("auditLog/all")]
    public async Task<ActionResult<ResponseModel<PagedResponse<GlobalAuditLogEntry>>>> GetAllCustomerAuditLog(
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10, CancellationToken cancellationToken = default) =>
        Reply(await customerService.GetAllCustomerAuditLog(pageNumber, pageSize, cancellationToken));

    [HttpPost("product")]
    public async Task<ActionResult<ResponseModel<Guid?>>> CreateProduct([FromBody] CreateProductRequest request,
        CancellationToken cancellationToken) =>
        Reply(await customerService.CreateProduct(request, cancellationToken));

    [HttpGet("products")]
    public async Task<ActionResult<ResponseModel<IReadOnlyList<ProductModel>>>> GetProducts(
        CancellationToken cancellationToken) =>
        Reply(await customerService.GetProducts(cancellationToken));

    [HttpGet("monthlyActivity")]
    public async Task<ActionResult<ResponseModel<MonthlyActivityModel>>> GetMonthlyActivity(
        CancellationToken cancellationToken) =>
        Reply(await customerService.GetMonthlyActivity(cancellationToken));

    [HttpGet("productDetails")]
    public async Task<ActionResult<ResponseModel<ProductDetailsModel>>> GetProductDetails(
        [FromQuery] Guid productGuid, CancellationToken cancellationToken) =>
        Reply(await customerService.GetProductDetails(productGuid, cancellationToken));

    [HttpGet("purchases")]
    public async Task<ActionResult<ResponseModel<IReadOnlyList<PurchaseModel>>>> GetCustomerPurchases(
        [FromQuery] Guid customerGuid, CancellationToken cancellationToken) =>
        Reply(await customerService.GetCustomerPurchases(customerGuid, cancellationToken));

    [HttpPost("purchase")]
    public async Task<ActionResult<ResponseModel<object>>> PurchaseProduct([FromQuery] Guid customerGuid,
        [FromQuery] Guid productGuid, CancellationToken cancellationToken) =>
        Reply(await customerService.PurchaseProduct(customerGuid, productGuid, MerchantId, cancellationToken));

    [HttpPatch("edit")]
    public async Task<ActionResult<ResponseModel<object>>> EditCustomer([FromBody] UpdateCustomerRequest request,
        CancellationToken cancellationToken) =>
        Reply(await customerService.EditCustomer(request, MerchantId, cancellationToken));

    [HttpPatch("deactivate")]
    public async Task<ActionResult<ResponseModel<object>>> DeactivateCustomer([FromQuery] Guid customerGuid,
        CancellationToken cancellationToken) =>
        Reply(await customerService.DeactivateCustomer(customerGuid, MerchantId, cancellationToken));

    [HttpPatch("reactivate")]
    public async Task<ActionResult<ResponseModel<object>>> ReactivateCustomer([FromQuery] Guid customerGuid,
        CancellationToken cancellationToken) =>
        Reply(await customerService.ReactivateCustomer(customerGuid, MerchantId, cancellationToken));

    [HttpDelete("delete")]
    public async Task<ActionResult<ResponseModel<object>>> DeleteCustomer([FromQuery] Guid customerGuid,
        CancellationToken cancellationToken) =>
        Reply(await customerService.DeleteCustomer(customerGuid, MerchantId, cancellationToken));

    // Explicit role check (not just the class-level [Authorize]) on top of a destructive,
    // untargeted action — wipes every audit row for every customer in one call. Today this
    // is a no-op in practice (1801 is the only Merchant.RoleCode that exists), but it stops a
    // future second role from silently inheriting access to this action.
    [Authorize(Roles = "1801")]
    [HttpDelete("auditLog/all")]
    public async Task<ActionResult<ResponseModel<object>>> DeleteAllCustomerAuditLog(
        CancellationToken cancellationToken) =>
        Reply(await customerService.DeleteAllCustomerAuditLog(cancellationToken));

    // The envelope's Status is the HTTP status to reply with.
    private ObjectResult Reply<T>(ResponseModel<T> response) => StatusCode(response.Status, response);
}
