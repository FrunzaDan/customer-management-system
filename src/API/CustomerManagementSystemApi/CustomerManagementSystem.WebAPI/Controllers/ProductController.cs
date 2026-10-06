using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.Products;
using CustomerManagementSystem.Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CustomerManagementSystem.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductController : ApiControllerBase
{
    [HttpGet("all")]
    public async Task<ActionResult<ResponseModel<IReadOnlyList<ProductModel>>>> GetProducts(
        [FromServices] GetProductsHandler handler, CancellationToken cancellationToken) =>
        Reply(await handler.HandleAsync(cancellationToken));

    [HttpGet("get")]
    public async Task<ActionResult<ResponseModel<ProductDetailsModel>>> GetProduct([FromQuery] Guid productId,
        [FromServices] GetProductDetailsHandler handler, CancellationToken cancellationToken) =>
        Reply(await handler.HandleAsync(productId, cancellationToken));

    [HttpPost("create")]
    public async Task<ActionResult<ResponseModel<Guid?>>> CreateProduct([FromBody] CreateProductRequest request,
        [FromServices] CreateProductHandler handler, CancellationToken cancellationToken) =>
        Reply(await handler.HandleAsync(request, cancellationToken));

    [HttpPost("reset-stock")]
    public async Task<ActionResult<ResponseModel<object>>> ResetProductStock(
        [FromServices] ResetProductStockHandler handler, CancellationToken cancellationToken) =>
        Reply(await handler.HandleAsync(cancellationToken));
}
