<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import {  DollarOutlined,
  LineChartOutlined,
  FileDoneOutlined,
  WalletOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined
} from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import type { LayoutCard } from "@/types/index";
import axios from "axios";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

defineProps<{
  card: LayoutCard;
}>();

// Active tab
const activeTab = ref<"dashboard" | "transactions" | "invoices" | "expenses">("dashboard");

// Dashboard data
const dashboardData = ref<any>(null);
const isLoadingDashboard = ref(false);

// Transactions
const transactions = ref<any[]>([]);
const transactionsTotal = ref(0);
const transactionsPage = ref(1);
const transactionsPageSize = ref(20);
const transactionsFilters = ref({
  status: "",
  type: "",
  search: ""
});
const isLoadingTransactions = ref(false);

// Invoices
const invoices = ref<any[]>([]);
const invoicesTotal = ref(0);
const invoicesPage = ref(1);
const invoicesPageSize = ref(20);
const invoicesFilters = ref({
  status: "",
  search: ""
});
const isLoadingInvoices = ref(false);

// Expenses
const expenses = ref<any[]>([]);
const expensesTotal = ref(0);
const expensesPage = ref(1);
const expensesPageSize = ref(20);
const expensesFilters = ref({
  category: "",
  search: ""
});
const isLoadingExpenses = ref(false);

// Modals
const showNewTransactionModal = ref(false);
const showNewInvoiceModal = ref(false);
const showNewExpenseModal = ref(false);

// New transaction form
const newTransaction = ref({
  userUuid: "",
  userName: "",
  userEmail: "",
  type: "payment",
  amount: 0,
  currency: "USD",
  description: "",
  paymentMethod: "",
  status: "completed"
});

// New invoice form
const newInvoice = ref({
  userUuid: "",
  userName: "",
  userEmail: "",
  dueDate: "",
  items: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
  tax: 0,
  notes: ""
});

// New expense form
const newExpense = ref({
  date: new Date().toISOString().split("T")[0],
  category: "infrastructure",
  description: "",
  amount: 0,
  currency: "USD",
  vendor: ""
});

// Chart instance
let revenueChart: Chart | null = null;

// Fetch dashboard data
const fetchDashboard = async () => {
  isLoadingDashboard.value = true;
  try {
    const response = await axios.get("/api/accounting/dashboard");
    dashboardData.value = response.data.data || response.data;

    // Update chart
    setTimeout(() => {
      renderChart();
    }, 100);
  } catch (error: any) {
    message.error(error.response?.data?.message || "Failed to load dashboard");
  } finally {
    isLoadingDashboard.value = false;
  }
};

// Fetch transactions
const fetchTransactions = async () => {
  isLoadingTransactions.value = true;
  try {
    const response = await axios.get("/api/accounting/transactions", {
      params: {
        page: transactionsPage.value,
        pageSize: transactionsPageSize.value,
        ...transactionsFilters.value
      }
    });
    const data = response.data.data || response.data;
    transactions.value = data.data || [];
    transactionsTotal.value = data.total || 0;
  } catch (error: any) {
    message.error(error.response?.data?.message || "Failed to load transactions");
  } finally {
    isLoadingTransactions.value = false;
  }
};

// Fetch invoices
const fetchInvoices = async () => {
  isLoadingInvoices.value = true;
  try {
    const response = await axios.get("/api/accounting/invoices", {
      params: {
        page: invoicesPage.value,
        pageSize: invoicesPageSize.value,
        ...invoicesFilters.value
      }
    });
    const data = response.data.data || response.data;
    invoices.value = data.data || [];
    invoicesTotal.value = data.total || 0;
  } catch (error: any) {
    message.error(error.response?.data?.message || "Failed to load invoices");
  } finally {
    isLoadingInvoices.value = false;
  }
};

// Fetch expenses
const fetchExpenses = async () => {
  isLoadingExpenses.value = true;
  try {
    const response = await axios.get("/api/accounting/expenses", {
      params: {
        page: expensesPage.value,
        pageSize: expensesPageSize.value,
        ...expensesFilters.value
      }
    });
    const data = response.data.data || response.data;
    expenses.value = data.data || [];
    expensesTotal.value = data.total || 0;
  } catch (error: any) {
    message.error(error.response?.data?.message || "Failed to load expenses");
  } finally {
    isLoadingExpenses.value = false;
  }
};

// Create transaction
const createTransaction = async () => {
  try {
    await axios.post("/api/accounting/transactions", newTransaction.value);
    message.success("Transaction created successfully");
    showNewTransactionModal.value = false;
    resetTransactionForm();
    fetchTransactions();
    fetchDashboard();
  } catch (error: any) {
    message.error(error.response?.data?.message || "Failed to create transaction");
  }
};

// Create invoice
const createInvoice = async () => {
  try {
    await axios.post("/api/accounting/invoices", newInvoice.value);
    message.success("Invoice created successfully");
    showNewInvoiceModal.value = false;
    resetInvoiceForm();
    fetchInvoices();
  } catch (error: any) {
    message.error(error.response?.data?.message || "Failed to create invoice");
  }
};

// Create expense
const createExpense = async () => {
  try {
    await axios.post("/api/accounting/expenses", newExpense.value);
    message.success("Expense created successfully");
    showNewExpenseModal.value = false;
    resetExpenseForm();
    fetchExpenses();
    fetchDashboard();
  } catch (error: any) {
    message.error(error.response?.data?.message || "Failed to create expense");
  }
};

// Reset forms
const resetTransactionForm = () => {
  newTransaction.value = {
    userUuid: "",
    userName: "",
    userEmail: "",
    type: "payment",
    amount: 0,
    currency: "USD",
    description: "",
    paymentMethod: "",
    status: "completed"
  };
};

const resetInvoiceForm = () => {
  newInvoice.value = {
    userUuid: "",
    userName: "",
    userEmail: "",
    dueDate: "",
    items: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
    tax: 0,
    notes: ""
  };
};

const resetExpenseForm = () => {
  newExpense.value = {
    date: new Date().toISOString().split("T")[0],
    category: "infrastructure",
    description: "",
    amount: 0,
    currency: "USD",
    vendor: ""
  };
};

// Add invoice item
const addInvoiceItem = () => {
  newInvoice.value.items.push({ description: "", quantity: 1, unitPrice: 0, total: 0 });
};

// Remove invoice item
const removeInvoiceItem = (index: number) => {
  newInvoice.value.items.splice(index, 1);
};

// Calculate invoice item total
const calculateItemTotal = (item: any) => {
  item.total = item.quantity * item.unitPrice;
};

// Invoice subtotal
const invoiceSubtotal = computed(() => {
  return newInvoice.value.items.reduce((sum, item) => sum + item.total, 0);
});

// Invoice total
const invoiceTotal = computed(() => {
  return invoiceSubtotal.value + newInvoice.value.tax;
});

// Format currency
const formatCurrency = (amount: number, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amount);
};

// Format date
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

// Get status color
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    completed: "#52c41a",
    pending: "#faad14",
    failed: "#f5222d",
    refunded: "#722ed1",
    paid: "#52c41a",
    draft: "#8c8c8c",
    cancelled: "#f5222d",
    overdue: "#ff4d4f"
  };
  return colors[status] || "#8c8c8c";
};

// Get status icon
const getStatusIcon = (status: string) => {
  const icons: Record<string, any> = {
    completed: CheckCircleOutlined,
    paid: CheckCircleOutlined,
    pending: ClockCircleOutlined,
    failed: CloseCircleOutlined,
    cancelled: CloseCircleOutlined,
    overdue: ExclamationCircleOutlined
  };
  return icons[status] || ClockCircleOutlined;
};

// Render chart
const renderChart = () => {
  if (!dashboardData.value?.monthlyTrend) return;

  const canvas = document.getElementById("revenueChart") as HTMLCanvasElement;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Destroy existing chart
  if (revenueChart) {
    revenueChart.destroy();
  }

  revenueChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: dashboardData.value.monthlyTrend.map((d: any) => d.month),
      datasets: [
        {
          label: "Revenue",
          data: dashboardData.value.monthlyTrend.map((d: any) => d.revenue),
          borderColor: "#FF8C42",
          backgroundColor: "rgba(255, 140, 66, 0.1)",
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => "$" + value
          }
        }
      }
    }
  });
};

// Watch tab changes
const changeTab = (tab: "dashboard" | "transactions" | "invoices" | "expenses") => {
  activeTab.value = tab;
  if (tab === "transactions" && transactions.value.length === 0) {
    fetchTransactions();
  } else if (tab === "invoices" && invoices.value.length === 0) {
    fetchInvoices();
  } else if (tab === "expenses" && expenses.value.length === 0) {
    fetchExpenses();
  }
};

onMounted(() => {
  fetchDashboard();
});
</script>

<template>
  <div class="accounting-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <DollarOutlined class="page-icon" />
        <div>
          <h1 class="page-title">{{ card.title }}</h1>
          <p class="page-subtitle">Financial management and accounting</p>
        </div>
      </div>
      <div class="header-right">
        <button class="action-button reload-btn" @click="fetchDashboard" :disabled="isLoadingDashboard">
          <ReloadOutlined :spin="isLoadingDashboard" />
          Reload
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-container">
      <button
        class="tab-button"
        :class="{ active: activeTab === 'dashboard' }"
        @click="changeTab('dashboard')"
      >
        <LineChartOutlined />
        Dashboard
      </button>
      <button
        class="tab-button"
        :class="{ active: activeTab === 'transactions' }"
        @click="changeTab('transactions')"
      >
        <WalletOutlined />
        Transactions
      </button>
      <button
        class="tab-button"
        :class="{ active: activeTab === 'invoices' }"
        @click="changeTab('invoices')"
      >
        <FileDoneOutlined />
        Invoices
      </button>
      <button
        class="tab-button"
        :class="{ active: activeTab === 'expenses' }"
        @click="changeTab('expenses')"
      >
        <DollarOutlined />
        Expenses
      </button>
    </div>

    <!-- Dashboard Tab -->
    <div v-if="activeTab === 'dashboard'" class="tab-content">
      <a-spin :spinning="isLoadingDashboard">
        <div v-if="dashboardData" class="dashboard-grid">
          <!-- Stats Cards -->
          <div class="stat-card total-revenue">
            <div class="stat-icon">
              <DollarOutlined />
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatCurrency(dashboardData.totalRevenue) }}</div>
              <div class="stat-label">Total Revenue</div>
            </div>
          </div>

          <div class="stat-card monthly-revenue">
            <div class="stat-icon">
              <LineChartOutlined />
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatCurrency(dashboardData.monthlyRevenue) }}</div>
              <div class="stat-label">Monthly Revenue</div>
            </div>
          </div>

          <div class="stat-card monthly-expenses">
            <div class="stat-icon">
              <WalletOutlined />
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatCurrency(dashboardData.monthlyExpenses) }}</div>
              <div class="stat-label">Monthly Expenses</div>
            </div>
          </div>

          <div class="stat-card monthly-profit">
            <div class="stat-icon">
              <FileDoneOutlined />
            </div>
            <div class="stat-content">
              <div class="stat-value" :style="{ color: dashboardData.monthlyProfit >= 0 ? '#52c41a' : '#f5222d' }">
                {{ formatCurrency(dashboardData.monthlyProfit) }}
              </div>
              <div class="stat-label">Monthly Profit</div>
            </div>
          </div>

          <!-- Revenue Chart -->
          <div class="chart-card">
            <h3 class="chart-title">Revenue Trend (Last 12 Months)</h3>
            <div class="chart-container">
              <canvas id="revenueChart"></canvas>
            </div>
          </div>

          <!-- Recent Transactions -->
          <div class="recent-transactions-card">
            <h3 class="card-title">Recent Transactions</h3>
            <div class="transactions-list">
              <div
                v-for="transaction in dashboardData.recentTransactions"
                :key="transaction.id"
                class="transaction-item"
              >
                <component :is="getStatusIcon(transaction.status)" :style="{ color: getStatusColor(transaction.status) }" />
                <div class="transaction-info">
                  <div class="transaction-desc">{{ transaction.description }}</div>
                  <div class="transaction-meta">{{ transaction.userName }} • {{ formatDate(transaction.date) }}</div>
                </div>
                <div class="transaction-amount">{{ formatCurrency(transaction.amount) }}</div>
              </div>
            </div>
          </div>
        </div>
      </a-spin>
    </div>

    <!-- Transactions Tab -->
    <div v-if="activeTab === 'transactions'" class="tab-content">
      <div class="tab-header">
        <div class="filters">
          <a-select v-model:value="transactionsFilters.status" placeholder="Status" style="width: 150px" @change="fetchTransactions">
            <a-select-option value="">All Status</a-select-option>
            <a-select-option value="completed">Completed</a-select-option>
            <a-select-option value="pending">Pending</a-select-option>
            <a-select-option value="failed">Failed</a-select-option>
            <a-select-option value="refunded">Refunded</a-select-option>
          </a-select>
          <a-select v-model:value="transactionsFilters.type" placeholder="Type" style="width: 150px" @change="fetchTransactions">
            <a-select-option value="">All Types</a-select-option>
            <a-select-option value="payment">Payment</a-select-option>
            <a-select-option value="subscription">Subscription</a-select-option>
            <a-select-option value="one-time">One-Time</a-select-option>
            <a-select-option value="refund">Refund</a-select-option>
          </a-select>
          <a-input
            v-model:value="transactionsFilters.search"
            placeholder="Search transactions..."
            style="width: 250px"
            @change="fetchTransactions"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input>
        </div>
        <button class="action-button primary-btn" @click="showNewTransactionModal = true">
          <PlusOutlined />
          New Transaction
        </button>
      </div>

      <a-spin :spinning="isLoadingTransactions">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="transaction in transactions" :key="transaction.id">
                <td>{{ formatDate(transaction.date) }}</td>
                <td>
                  <div class="user-cell">
                    <div>{{ transaction.userName }}</div>
                    <div class="user-email">{{ transaction.userEmail }}</div>
                  </div>
                </td>
                <td><span class="type-badge">{{ transaction.type }}</span></td>
                <td>{{ transaction.description }}</td>
                <td class="amount-cell">{{ formatCurrency(transaction.amount) }}</td>
                <td>
                  <span class="status-badge" :style="{ backgroundColor: getStatusColor(transaction.status) + '15', color: getStatusColor(transaction.status) }">
                    <component :is="getStatusIcon(transaction.status)" />
                    {{ transaction.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-container" v-if="transactionsTotal > transactionsPageSize">
          <a-pagination
            v-model:current="transactionsPage"
            :total="transactionsTotal"
            :page-size="transactionsPageSize"
            @change="fetchTransactions"
          />
        </div>
      </a-spin>
    </div>

    <!-- Invoices Tab -->
    <div v-if="activeTab === 'invoices'" class="tab-content">
      <div class="tab-header">
        <div class="filters">
          <a-select v-model:value="invoicesFilters.status" placeholder="Status" style="width: 150px" @change="fetchInvoices">
            <a-select-option value="">All Status</a-select-option>
            <a-select-option value="draft">Draft</a-select-option>
            <a-select-option value="pending">Pending</a-select-option>
            <a-select-option value="paid">Paid</a-select-option>
            <a-select-option value="overdue">Overdue</a-select-option>
            <a-select-option value="cancelled">Cancelled</a-select-option>
          </a-select>
          <a-input
            v-model:value="invoicesFilters.search"
            placeholder="Search invoices..."
            style="width: 250px"
            @change="fetchInvoices"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input>
        </div>
        <button class="action-button primary-btn" @click="showNewInvoiceModal = true">
          <PlusOutlined />
          New Invoice
        </button>
      </div>

      <a-spin :spinning="isLoadingInvoices">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>User</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="invoice in invoices" :key="invoice.id">
                <td class="invoice-number">{{ invoice.invoiceNumber }}</td>
                <td>{{ formatDate(invoice.date) }}</td>
                <td>{{ formatDate(invoice.dueDate) }}</td>
                <td>
                  <div class="user-cell">
                    <div>{{ invoice.userName }}</div>
                    <div class="user-email">{{ invoice.userEmail }}</div>
                  </div>
                </td>
                <td class="amount-cell">{{ formatCurrency(invoice.total) }}</td>
                <td>
                  <span class="status-badge" :style="{ backgroundColor: getStatusColor(invoice.status) + '15', color: getStatusColor(invoice.status) }">
                    <component :is="getStatusIcon(invoice.status)" />
                    {{ invoice.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-container" v-if="invoicesTotal > invoicesPageSize">
          <a-pagination
            v-model:current="invoicesPage"
            :total="invoicesTotal"
            :page-size="invoicesPageSize"
            @change="fetchInvoices"
          />
        </div>
      </a-spin>
    </div>

    <!-- Expenses Tab -->
    <div v-if="activeTab === 'expenses'" class="tab-content">
      <div class="tab-header">
        <div class="filters">
          <a-select v-model:value="expensesFilters.category" placeholder="Category" style="width: 200px" @change="fetchExpenses">
            <a-select-option value="">All Categories</a-select-option>
            <a-select-option value="infrastructure">Infrastructure</a-select-option>
            <a-select-option value="marketing">Marketing</a-select-option>
            <a-select-option value="software">Software</a-select-option>
            <a-select-option value="salaries">Salaries</a-select-option>
            <a-select-option value="other">Other</a-select-option>
          </a-select>
          <a-input
            v-model:value="expensesFilters.search"
            placeholder="Search expenses..."
            style="width: 250px"
            @change="fetchExpenses"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input>
        </div>
        <button class="action-button primary-btn" @click="showNewExpenseModal = true">
          <PlusOutlined />
          New Expense
        </button>
      </div>

      <a-spin :spinning="isLoadingExpenses">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Vendor</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="expense in expenses" :key="expense.id">
                <td>{{ formatDate(expense.date) }}</td>
                <td><span class="category-badge">{{ expense.category }}</span></td>
                <td>{{ expense.description }}</td>
                <td>{{ expense.vendor || 'N/A' }}</td>
                <td class="amount-cell expense-amount">-{{ formatCurrency(expense.amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-container" v-if="expensesTotal > expensesPageSize">
          <a-pagination
            v-model:current="expensesPage"
            :total="expensesTotal"
            :page-size="expensesPageSize"
            @change="fetchExpenses"
          />
        </div>
      </a-spin>
    </div>

    <!-- New Transaction Modal -->
    <a-modal v-model:open="showNewTransactionModal" title="New Transaction" @ok="createTransaction" width="600px">
      <a-form layout="vertical" class="modal-form">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="User UUID">
              <a-input v-model:value="newTransaction.userUuid" placeholder="Enter user UUID" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="User Name">
              <a-input v-model:value="newTransaction.userName" placeholder="Enter user name" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="User Email">
          <a-input v-model:value="newTransaction.userEmail" placeholder="Enter user email" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Type">
              <a-select v-model:value="newTransaction.type">
                <a-select-option value="payment">Payment</a-select-option>
                <a-select-option value="subscription">Subscription</a-select-option>
                <a-select-option value="one-time">One-Time</a-select-option>
                <a-select-option value="refund">Refund</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Status">
              <a-select v-model:value="newTransaction.status">
                <a-select-option value="completed">Completed</a-select-option>
                <a-select-option value="pending">Pending</a-select-option>
                <a-select-option value="failed">Failed</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="16">
            <a-form-item label="Amount">
              <a-input-number v-model:value="newTransaction.amount" :min="0" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Currency">
              <a-select v-model:value="newTransaction.currency">
                <a-select-option value="USD">USD</a-select-option>
                <a-select-option value="EUR">EUR</a-select-option>
                <a-select-option value="GBP">GBP</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Description">
          <a-textarea v-model:value="newTransaction.description" :rows="3" placeholder="Enter transaction description" />
        </a-form-item>
        <a-form-item label="Payment Method (Optional)">
          <a-input v-model:value="newTransaction.paymentMethod" placeholder="e.g., Credit Card, PayPal" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- New Invoice Modal -->
    <a-modal v-model:open="showNewInvoiceModal" title="New Invoice" @ok="createInvoice" width="800px">
      <a-form layout="vertical" class="modal-form">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="User UUID">
              <a-input v-model:value="newInvoice.userUuid" placeholder="Enter user UUID" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="User Name">
              <a-input v-model:value="newInvoice.userName" placeholder="Enter user name" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Due Date">
              <a-input v-model:value="newInvoice.dueDate" type="date" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="User Email">
          <a-input v-model:value="newInvoice.userEmail" placeholder="Enter user email" />
        </a-form-item>

        <div class="invoice-items-section">
          <h4>Invoice Items</h4>
          <div v-for="(item, index) in newInvoice.items" :key="index" class="invoice-item">
            <a-row :gutter="16">
              <a-col :span="10">
                <a-input v-model:value="item.description" placeholder="Description" />
              </a-col>
              <a-col :span="5">
                <a-input-number v-model:value="item.quantity" :min="1" @change="calculateItemTotal(item)" style="width: 100%" />
              </a-col>
              <a-col :span="5">
                <a-input-number v-model:value="item.unitPrice" :min="0" :step="0.01" @change="calculateItemTotal(item)" style="width: 100%" />
              </a-col>
              <a-col :span="3">
                <span class="item-total">${{ item.total.toFixed(2) }}</span>
              </a-col>
              <a-col :span="1">
                <a-button type="text" danger @click="removeInvoiceItem(index)" v-if="newInvoice.items.length > 1">
                  <CloseCircleOutlined />
                </a-button>
              </a-col>
            </a-row>
          </div>
          <a-button type="dashed" @click="addInvoiceItem" block>
            <PlusOutlined /> Add Item
          </a-button>
        </div>

        <a-form-item label="Tax">
          <a-input-number v-model:value="newInvoice.tax" :min="0" :step="0.01" style="width: 100%" />
        </a-form-item>

        <div class="invoice-totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${{ invoiceSubtotal.toFixed(2) }}</span>
          </div>
          <div class="total-row">
            <span>Tax:</span>
            <span>${{ newInvoice.tax.toFixed(2) }}</span>
          </div>
          <div class="total-row grand-total">
            <span>Total:</span>
            <span>${{ invoiceTotal.toFixed(2) }}</span>
          </div>
        </div>

        <a-form-item label="Notes (Optional)">
          <a-textarea v-model:value="newInvoice.notes" :rows="3" placeholder="Enter any additional notes" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- New Expense Modal -->
    <a-modal v-model:open="showNewExpenseModal" title="New Expense" @ok="createExpense" width="600px">
      <a-form layout="vertical" class="modal-form">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Date">
              <a-input v-model:value="newExpense.date" type="date" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Category">
              <a-select v-model:value="newExpense.category">
                <a-select-option value="infrastructure">Infrastructure</a-select-option>
                <a-select-option value="marketing">Marketing</a-select-option>
                <a-select-option value="software">Software</a-select-option>
                <a-select-option value="salaries">Salaries</a-select-option>
                <a-select-option value="other">Other</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Description">
          <a-input v-model:value="newExpense.description" placeholder="Enter expense description" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="16">
            <a-form-item label="Amount">
              <a-input-number v-model:value="newExpense.amount" :min="0" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Currency">
              <a-select v-model:value="newExpense.currency">
                <a-select-option value="USD">USD</a-select-option>
                <a-select-option value="EUR">EUR</a-select-option>
                <a-select-option value="GBP">GBP</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Vendor (Optional)">
          <a-input v-model:value="newExpense.vendor" placeholder="Enter vendor name" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style lang="scss" scoped>
.accounting-page {
  padding: 24px;
}

// Header
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.15), rgba(212, 175, 55, 0.15));
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #FF8C42;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color);
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-gray-7);
  margin: 4px 0 0;
}

.header-right {
  display: flex;
  gap: 12px;
}

.action-button {
  height: 40px;
  padding: 0 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
}

.reload-btn {
  border: 2px solid var(--card-border-color);
  color: var(--text-color);

  &:hover {
    border-color: #FF8C42;
    color: #FF8C42;
  }
}

.primary-btn {
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  color: white;
  box-shadow: 0 2px 8px rgba(255, 140, 66, 0.3);

  &:hover {
    box-shadow: 0 4px 16px rgba(255, 140, 66, 0.4);
  }
}

// Tabs
.tabs-container {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid var(--card-border-color);
}

.tab-button {
  padding: 12px 24px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--color-gray-7);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: -2px;

  &:hover {
    color: #FF8C42;
  }

  &.active {
    color: #FF8C42;
    border-bottom-color: #FF8C42;
  }
}

// Tab Content
.tab-content {
  min-height: 500px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.filters {
  display: flex;
  gap: 12px;
}

// Dashboard
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.stat-card {
  background: var(--background-color-white);
  border: 1px solid var(--card-border-color);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 16px rgba(255, 140, 66, 0.2);
  }
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.1), rgba(212, 175, 55, 0.1));
  color: #FF8C42;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-color);
  display: block;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--color-gray-7);
}

.chart-card {
  grid-column: 1 / -1;
  background: var(--background-color-white);
  border: 1px solid var(--card-border-color);
  border-radius: 12px;
  padding: 24px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 16px;
}

.chart-container {
  height: 300px;
}

.recent-transactions-card {
  grid-column: 1 / -1;
  background: var(--background-color-white);
  border: 1px solid var(--card-border-color);
  border-radius: 12px;
  padding: 24px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 16px;
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--background-color);
  border-radius: 8px;
  border: 1px solid var(--card-border-color);
}

.transaction-info {
  flex: 1;
}

.transaction-desc {
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 4px;
}

.transaction-meta {
  font-size: 12px;
  color: var(--color-gray-7);
}

.transaction-amount {
  font-weight: 700;
  color: #FF8C42;
}

// Tables
.table-container {
  background: var(--background-color-white);
  border: 1px solid var(--card-border-color);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 24px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;

  thead {
    background: linear-gradient(135deg, rgba(255, 140, 66, 0.08), rgba(212, 175, 55, 0.08));
    border-bottom: 2px solid #FF8C42;

    th {
      padding: 16px;
      text-align: left;
      font-weight: 700;
      font-size: 13px;
      color: var(--text-color);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid var(--card-border-color);
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 140, 66, 0.04);
      }

      td {
        padding: 14px 16px;
        vertical-align: middle;
        font-size: 13px;
        color: var(--text-color);
      }
    }
  }
}

.user-cell {
  div {
    &:first-child {
      font-weight: 600;
    }
  }
}

.user-email {
  font-size: 12px;
  color: var(--color-gray-7);
  font-family: monospace;
}

.amount-cell {
  font-weight: 600;
  color: #52c41a;
  font-size: 14px;
}

.expense-amount {
  color: #f5222d;
}

.type-badge,
.category-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  background: rgba(255, 140, 66, 0.1);
  color: #FF8C42;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
}

.invoice-number {
  font-family: monospace;
  font-weight: 600;
  color: #FF8C42;
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

// Modal Forms
.modal-form {
  margin-top: 24px;
}

.invoice-items-section {
  margin: 24px 0;

  h4 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
  }
}

.invoice-item {
  margin-bottom: 12px;
}

.item-total {
  font-weight: 600;
  color: #FF8C42;
  font-size: 14px;
}

.invoice-totals {
  background: var(--background-color);
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;

  &.grand-total {
    border-top: 2px solid var(--card-border-color);
    margin-top: 8px;
    padding-top: 16px;
    font-size: 16px;
    font-weight: 700;
    color: #FF8C42;
  }
}

// Responsive
@media (max-width: 1400px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .accounting-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .header-right {
    width: 100%;
  }

  .tabs-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .tab-button {
    white-space: nowrap;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .tab-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .filters {
    flex-direction: column;
  }

  .table-container {
    overflow-x: auto;
  }

  .data-table {
    min-width: 800px;
  }
}
</style>
