namespace GereltjinCargoApi.Models
{
    public class OrderHistory
{
    public Guid id  { get; set; }
    public Guid order_id { get; set; }
    public Guid worker_id { get; set; }
    public string? worker_name { get; set; }
    public string action { get; set; } = string.Empty;
    public string? old_status { get; set; }
    public string? new_status { get; set; }
    public string? changes { get; set; }
    public DateTime created_at { get; set; }
    
    public Order? Order { get; set; }
    public Worker? Worker { get; set; }
}
}