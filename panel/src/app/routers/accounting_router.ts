import Koa from "koa";
import Router from "@koa/router";
import permission from "../middleware/permission";
import { ROLE } from "../entity/user";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../service/log";

const router = new Router({ prefix: "/accounting" });

// In-memory storage (replace with actual database in production)
interface Transaction {
  id: string;
  date: string;
  userUuid: string;
  userName: string;
  userEmail: string;
  type: "payment" | "refund" | "subscription" | "one-time";
  amount: number;
  currency: string;
  status: "completed" | "pending" | "failed" | "refunded";
  description: string;
  paymentMethod?: string;
  invoiceId?: string;
  createdBy: string; // Admin UUID who created this
  createdAt: string;
  updatedAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  userUuid: string;
  userName: string;
  userEmail: string;
  date: string;
  dueDate: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: "draft" | "pending" | "paid" | "cancelled" | "overdue";
  notes?: string;
  createdBy: string; // Admin UUID who created this
  createdAt: string;
  updatedAt: string;
}

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  vendor?: string;
  receiptUrl?: string;
  createdBy: string;
  createdAt: string;
}

const transactions: Transaction[] = [];
const invoices: Invoice[] = [];
const expenses: Expense[] = [];

// Helper to generate invoice number
function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const count = String(invoices.length + 1).padStart(4, "0");
  return `INV-${year}${month}-${count}`;
}

// GET /api/accounting/users/search - Search users for transactions/invoices
router.get("/users/search", permission({ level: ROLE.ADMIN }), async (ctx: Koa.ParameterizedContext) => {
  const { search } = ctx.query;
  const Storage = (await import("../common/storage/sys_storage")).default;

  const allUsers = await Storage.getStorage().list("User");

  let filtered = allUsers;
  if (search) {
    const searchLower = String(search).toLowerCase();
    filtered = allUsers.filter((user: any) =>
      user.userName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower)
    );
  }

  // Return simplified user data
  const users = filtered.slice(0, 50).map((user: any) => ({
    uuid: user.uuid,
    userName: user.userName,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim() || user.userName,
    permission: user.permission,
    accountStatus: user.accountStatus
  }));

  ctx.body = { users };
});

// GET /api/accounting/users/:uuid - Get user by UUID
router.get("/users/:uuid", permission({ level: ROLE.ADMIN }), async (ctx: Koa.ParameterizedContext) => {
  const { uuid } = ctx.params;
  const Storage = (await import("../common/storage/sys_storage")).default;

  const user = await Storage.getStorage().load("User", uuid);
  if (!user) {
    ctx.status = 404;
    ctx.body = { success: false, message: "User not found" };
    return;
  }

  ctx.body = {
    uuid: user.uuid,
    userName: user.userName,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim() || user.userName,
    permission: user.permission,
    accountStatus: user.accountStatus
  };
});

// GET /api/accounting/dashboard - Get financial dashboard overview
router.get("/dashboard", permission({ level: ROLE.ADMIN }), async (ctx: Koa.ParameterizedContext) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Calculate total revenue
  const totalRevenue = transactions
    .filter((t) => t.status === "completed" && t.type !== "refund")
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate monthly revenue
  const monthlyRevenue = transactions
    .filter((t) => {
      const tDate = new Date(t.date);
      return (
        t.status === "completed" &&
        t.type !== "refund" &&
        tDate.getMonth() === currentMonth &&
        tDate.getFullYear() === currentYear
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate monthly expenses
  const monthlyExpenses = expenses
    .filter((e) => {
      const eDate = new Date(e.date);
      return eDate.getMonth() === currentMonth && eDate.getFullYear() === currentYear;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  // Active subscriptions
  const activeSubscriptions = transactions.filter(
    (t) => t.type === "subscription" && t.status === "completed"
  ).length;

  // Pending payments
  const pendingPayments = invoices.filter((i) => i.status === "pending").length;

  // Monthly trend (last 12 months)
  const monthlyTrend = [];
  for (let i = 11; i >= 0; i--) {
    const targetDate = new Date(currentYear, currentMonth - i, 1);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    const revenue = transactions
      .filter((t) => {
        const tDate = new Date(t.date);
        return (
          t.status === "completed" &&
          t.type !== "refund" &&
          tDate.getMonth() === targetMonth &&
          tDate.getFullYear() === targetYear
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);

    monthlyTrend.push({
      month: targetDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      revenue
    });
  }

  // Recent transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  ctx.body = {
    totalRevenue,
    monthlyRevenue,
    monthlyExpenses,
    monthlyProfit: monthlyRevenue - monthlyExpenses,
    activeSubscriptions,
    pendingPayments,
    totalTransactions: transactions.length,
    monthlyTrend,
    recentTransactions
  };
});

// GET /api/accounting/transactions - Get all transactions
router.get("/transactions", permission({ level: ROLE.ADMIN }), async (ctx: Koa.ParameterizedContext) => {
  const { page = 1, pageSize = 20, status, type, search } = ctx.query;

  let filtered = [...transactions];

  // Filter by status
  if (status) {
    filtered = filtered.filter((t) => t.status === status);
  }

  // Filter by type
  if (type) {
    filtered = filtered.filter((t) => t.type === type);
  }

  // Search
  if (search) {
    const searchLower = String(search).toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.userName.toLowerCase().includes(searchLower) ||
        t.userEmail.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
    );
  }

  // Sort by date (newest first)
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Paginate
  const total = filtered.length;
  const start = (Number(page) - 1) * Number(pageSize);
  const paginated = filtered.slice(start, start + Number(pageSize));

  ctx.body = {
    data: paginated,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
    maxPage: Math.ceil(total / Number(pageSize))
  };
});

// POST /api/accounting/transactions - Create new transaction
router.post("/transactions", permission({ level: ROLE.ADMIN }), async (ctx: Koa.ParameterizedContext) => {
  const { userUuid, userName, userEmail, type, amount, currency, description, paymentMethod, status } =
    ctx.request.body as any;

  const adminUuid = ctx.state.user?.uuid;

  const transaction: Transaction = {
    id: uuidv4(),
    date: new Date().toISOString(),
    userUuid,
    userName,
    userEmail,
    type,
    amount: Number(amount),
    currency: currency || "USD",
    status: status || "completed",
    description,
    paymentMethod,
    createdBy: adminUuid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  transactions.push(transaction);
  logger.info(`[Accounting] Transaction created by ${adminUuid}: ${transaction.id} for user ${userUuid}`);

  ctx.body = { success: true, transaction };
});

// GET /api/accounting/invoices - Get all invoices
router.get("/invoices", permission({ level: ROLE.ADMIN }), async (ctx: Koa.ParameterizedContext) => {
  const { page = 1, pageSize = 20, status, search } = ctx.query;

  let filtered = [...invoices];

  // Filter by status
  if (status) {
    filtered = filtered.filter((i) => i.status === status);
  }

  // Search
  if (search) {
    const searchLower = String(search).toLowerCase();
    filtered = filtered.filter(
      (i) =>
        i.invoiceNumber.toLowerCase().includes(searchLower) ||
        i.userName.toLowerCase().includes(searchLower) ||
        i.userEmail.toLowerCase().includes(searchLower)
    );
  }

  // Sort by date (newest first)
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Paginate
  const total = filtered.length;
  const start = (Number(page) - 1) * Number(pageSize);
  const paginated = filtered.slice(start, start + Number(pageSize));

  ctx.body = {
    data: paginated,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
    maxPage: Math.ceil(total / Number(pageSize))
  };
});

// POST /api/accounting/invoices - Create new invoice
router.post("/invoices", permission({ level: ROLE.ADMIN }), async (ctx: Koa.ParameterizedContext) => {
  const { userUuid, userName, userEmail, dueDate, items, tax, notes } = ctx.request.body as any;

  const adminUuid = ctx.state.user?.uuid;
  const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0);
  const total = subtotal + (tax || 0);

  const invoice: Invoice = {
    id: uuidv4(),
    invoiceNumber: generateInvoiceNumber(),
    userUuid,
    userName,
    userEmail,
    date: new Date().toISOString(),
    dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    items,
    subtotal,
    tax: tax || 0,
    total,
    status: "pending",
    notes,
    createdBy: adminUuid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  invoices.push(invoice);
  logger.info(`[Accounting] Invoice ${invoice.invoiceNumber} created by ${adminUuid} for user ${userUuid}`);

  ctx.body = { success: true, invoice };
});

// PUT /api/accounting/invoices/:id - Update invoice status
router.put("/invoices/:id", permission({ level: ROLE.ADMIN }), async (ctx: Koa.ParameterizedContext) => {
  const { id } = ctx.params;
  const { status } = ctx.request.body as any;

  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) {
    ctx.status = 404;
    ctx.body = { success: false, message: "Invoice not found" };
    return;
  }

  invoice.status = status;
  invoice.updatedAt = new Date().toISOString();

  logger.info(`[Accounting] Invoice ${invoice.invoiceNumber} updated to ${status}`);

  ctx.body = { success: true, invoice };
});

// GET /api/accounting/expenses - Get all expenses
router.get("/expenses", permission({ level: ROLE.ADMIN }), async (ctx: Koa.ParameterizedContext) => {
  const { page = 1, pageSize = 20, category, search } = ctx.query;

  let filtered = [...expenses];

  // Filter by category
  if (category) {
    filtered = filtered.filter((e) => e.category === category);
  }

  // Search
  if (search) {
    const searchLower = String(search).toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.description.toLowerCase().includes(searchLower) ||
        e.vendor?.toLowerCase().includes(searchLower)
    );
  }

  // Sort by date (newest first)
  filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Paginate
  const total = filtered.length;
  const start = (Number(page) - 1) * Number(pageSize);
  const paginated = filtered.slice(start, start + Number(pageSize));

  ctx.body = {
    data: paginated,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
    maxPage: Math.ceil(total / Number(pageSize))
  };
});

// POST /api/accounting/expenses - Create new expense
router.post("/expenses", permission({ level: ROLE.ADMIN }), async (ctx: Koa.ParameterizedContext) => {
  const { date, category, description, amount, currency, vendor } = ctx.request.body as any;
  const userUuid = ctx.state.user?.uuid;

  const expense: Expense = {
    id: uuidv4(),
    date: date || new Date().toISOString(),
    category,
    description,
    amount: Number(amount),
    currency: currency || "USD",
    vendor,
    createdBy: userUuid,
    createdAt: new Date().toISOString()
  };

  expenses.push(expense);
  logger.info(`[Accounting] New expense created: ${expense.id}`);

  ctx.body = { success: true, expense };
});

// GET /api/accounting/reports/revenue - Get revenue report
router.get("/reports/revenue", permission({ level: ROLE.ADMIN }), async (ctx: Koa.ParameterizedContext) => {
  const { startDate, endDate } = ctx.query;

  const start = startDate ? new Date(String(startDate)) : new Date(0);
  const end = endDate ? new Date(String(endDate)) : new Date();

  const filtered = transactions.filter((t) => {
    const tDate = new Date(t.date);
    return tDate >= start && tDate <= end && t.status === "completed" && t.type !== "refund";
  });

  const totalRevenue = filtered.reduce((sum, t) => sum + t.amount, 0);

  const byType = {
    subscription: filtered.filter((t) => t.type === "subscription").reduce((sum, t) => sum + t.amount, 0),
    "one-time": filtered.filter((t) => t.type === "one-time").reduce((sum, t) => sum + t.amount, 0),
    payment: filtered.filter((t) => t.type === "payment").reduce((sum, t) => sum + t.amount, 0)
  };

  ctx.body = {
    totalRevenue,
    transactionCount: filtered.length,
    byType,
    transactions: filtered
  };
});

export default router;
