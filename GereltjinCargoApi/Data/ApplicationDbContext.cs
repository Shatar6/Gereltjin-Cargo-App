using GereltjinCargoApi.Models;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace GereltjinCargoApi.Data
{

    public class ApplicationDbContext : DbContext
    {
        public DbSet<Worker> Workers { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderHistory> OrderHistory { get; set; } // Add this

        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<OrderHistory>()
                .HasOne(h => h.Order)
                .WithMany(o => o.History)
                .HasForeignKey(h => h.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<OrderHistory>()
                .HasOne(h => h.Worker)
                .WithMany()
                .HasForeignKey(h => h.WorkerId);
        }
    }
}