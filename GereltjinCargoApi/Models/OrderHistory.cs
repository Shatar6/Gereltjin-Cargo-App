namespace GereltjinCargoApi.Models
{
    public class OrderHistory
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Guid WorkerId { get; set; }
    public string WorkerName { get; set; }
    public string Action { get; set; } // "created", "updated", "status_changed"
    public string OldStatus { get; set; }
    public string NewStatus { get; set; }
    public string Changes { get; set; } // JSON string
    public DateTime CreatedAt { get; set; }
    
    public Order Order { get; set; }
    public Worker Worker { get; set; }
}
}