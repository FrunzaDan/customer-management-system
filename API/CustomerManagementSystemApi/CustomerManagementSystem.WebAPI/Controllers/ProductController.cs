using CustomerManagementSystem.BusinessLogic.Services;
using CustomerManagementSystem.Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CustomerManagementSystem.WebAPI.Controllers;

// The product catalogue, in its own controller like the employee app's OfficeController.
// Buying a product stays on CustomerController (purchase/purchases): it is an action a
// customer takes, and it is audited on that customer.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductController(IProductService productService) : ApiControllerBase
{
    [HttpGet("all")]
    public async Task<ActionResult<ResponseModel<IReadOnlyList<ProductModel>>>> GetProducts(
        CancellationToken cancellationToken) =>
        Reply(await productService.GetProductsAsync(cancellationToken));

    [HttpGet("get")]
    public async Task<ActionResult<ResponseModel<ProductDetailsModel>>> GetProduct([FromQuery] Guid productId,
        CancellationToken cancellationToken) =>
        Reply(await productService.GetProductDetailsAsync(productId, cancellationToken));

    [HttpPost("create")]
    public async Task<ActionResult<ResponseModel<Guid?>>> CreateProduct([FromBody] CreateProductRequest request,
        CancellationToken cancellationToken) =>
        Reply(await productService.CreateProductAsync(request, cancellationToken));
}
