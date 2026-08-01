/* ==========================================================================
   1. DOM ELEMENTS & APPLICATION STATE
   ========================================================================== */
const form = document.querySelector("#transaction-form");
const titleInput = document.querySelector("#title");
const amountInput = document.querySelector("#amount");
const categoryInput = document.querySelector("#category");
const dateInput = document.querySelector("#date");
const typeInput = document.querySelector("#type");

const totalBalanceEl = document.querySelector("#total-balance");
const totalIncomeEl = document.querySelector("#total-income");
const totalExpenseEl = document.querySelector("#total-expense");
const parentList = document.getElementById("transaction-list");
const filterSearchInput = document.querySelector("#filter-search");
const filterTypeSelect = document.querySelector("#filter-type");
const filterCategorySelect = document.querySelector("#filter-category");
const filterDateInput = document.querySelector("#filter-date");
const sortSelect = document.querySelector("#sort-select");
const formErrorEl = document.querySelector("#form-error");
const themeToggle = document.querySelector("#theme-toggle");

// Persistent State
// Store all transactions loaded from localStorage
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

// Tracks which transaction is being edited (null means we are adding a new one)
let editingId = null;

// Centralized filter state
// These values are updated from the filter controls in the UI
const filters = {
  typeFilter: "all", // "all", "income", or "expense"
  categoryFilter: "all", // selected category or "all"
  dateFilter: "", // selected date string or empty
  searchText: "", // text typed in the search box
  sortBy: "latest", // sort option: latest, oldest, highest, lowest
};

/* ==========================================================================
   2. STORAGE & CALCULATIONS
   ========================================================================== */
function saveTransactionsToStorage() {
  // Save the latest transactions array into localStorage
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

function showFormError(message) {
  // Show an error message below the form
  if (formErrorEl) {
    formErrorEl.textContent = message;
  }
}

function clearFormError() {
  // Clear the error message when the user enters valid input
  if (formErrorEl) {
    formErrorEl.textContent = "";
  }
}

function validateTransactionData(transactionData) {
  // लेन-देन को सेव करने से पहले जरूरी फील्ड्स की जांच करें
  if (!transactionData.title) {
    return "Title is required.";
  }

  if (!transactionData.category) {
    return "Category is required.";
  }

  if (!transactionData.date) {
    return "Date is required.";
  }

  if (!transactionData.type) {
    return "Type is required.";
  }

  if (Number.isNaN(transactionData.amount) || transactionData.amount <= 0) {
    return "Amount must be greater than 0.";
  }

  // यह जांचें कि date सही फॉर्मेट में है
  const parsedDate = new Date(transactionData.date);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Date must be valid.";
  }

  return "";
}

function updateSummary(data = transactions) {
  // Calculate totals from the provided data set
  // If no argument is passed, it uses the full transactions array
  const totalIncome = data.reduce((sum, item) => {
    return item.type.toLowerCase() === "income" ? sum + Number(item.amount) : sum;
  }, 0);

  const totalExpense = data.reduce((sum, item) => {
    return item.type.toLowerCase() === "expense" ? sum + Number(item.amount) : sum;
  }, 0);

  const totalBalance = totalIncome - totalExpense;

  totalBalanceEl.textContent = `$${totalBalance.toFixed(2)}`;
  totalIncomeEl.textContent = `$${totalIncome.toFixed(2)}`;
  totalExpenseEl.textContent = `$${totalExpense.toFixed(2)}`;
}

function getFilteredTransactions() {
  // Start with all transactions and narrow them down step by step
  // Each active filter must pass for the transaction to remain visible
  const searchText = filters.searchText.trim().toLowerCase();

  return transactions.filter((transaction) => {
    // 1. Type match
    const matchesType =
      filters.typeFilter === "all" ||
      transaction.type.toLowerCase() === filters.typeFilter;

    // 2. Category match
    const matchesCategory =
      filters.categoryFilter === "all" ||
      transaction.category.toLowerCase() === filters.categoryFilter.toLowerCase();

    // 3. Date match
    const matchesDate = !filters.dateFilter || transaction.date === filters.dateFilter;

    // 4. Title search match
    const matchesSearch =
      !searchText || transaction.title.toLowerCase().includes(searchText);

    // The transaction stays only if it passes all active filters
    return matchesType && matchesCategory && matchesDate && matchesSearch;
  });
}

function getSortedTransactions(listToRender = getFilteredTransactions()) {
  // Copy the filtered list so we do not mutate the original array
  const sortedTransactions = [...listToRender];

  switch (filters.sortBy) {
    case "oldest":
      sortedTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case "highest":
      sortedTransactions.sort((a, b) => Number(b.amount) - Number(a.amount));
      break;
    case "lowest":
      sortedTransactions.sort((a, b) => Number(a.amount) - Number(b.amount));
      break;
    case "latest":
    default:
      sortedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
  }

  return sortedTransactions;
}

function updateThemeToggle() {
  if (!themeToggle) return;

  const isDarkMode = document.body.classList.contains("dark-mode");
  themeToggle.innerHTML = isDarkMode ? "☀️" : "🌙";
  themeToggle.setAttribute("aria-pressed", String(isDarkMode));
}

function applyStoredTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldUseDark = savedTheme ? savedTheme === "dark" : prefersDark;

  if (shouldUseDark) {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }

  updateThemeToggle();
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDarkMode = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    updateThemeToggle();
  });
}

/* ==========================================================================
   3. RENDERING & UI COMPONENTS
   ========================================================================== */
function createTransactionCard(data) {
  // Create a single card element for one transaction
  const li = document.createElement("li");
  const transactionType = data.type.toLowerCase();
  const isIncome = transactionType === "income";

  // Add a CSS class based on transaction type
  li.className = `transaction-card ${transactionType}`;

  // Show + sign for income and - sign for expense
  const amountSign = isIncome ? "+" : "-";
  const amountClass = isIncome ? "type-income" : "type-expense";

  li.innerHTML = `
    <div class="transaction-info">
      <h4 class="transaction-title">${data.title}</h4>
      <p class="transaction-meta">
        <span class="category">${data.category}</span> |
        <span class="date">${data.date}</span>
      </p>
      <p class="transaction-amount ${amountClass}">
        ${amountSign}$${Number(data.amount).toFixed(2)}
      </p>
    </div>

    <div class="transaction-actions">
      <button class="btn-icon btn-edit" type="button" title="Edit">
        <i class="fa-solid fa-pen-to-square"></i>
      </button>
      <button class="btn-icon btn-delete" type="button" title="Delete">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `;

  // Attach Delete Event
  // When delete is clicked, ask for confirmation before removing the transaction
  li.querySelector(".btn-delete").addEventListener("click", () => {
    const shouldDelete = window.confirm(`Are you sure you want to delete "${data.title}"?`);

    if (!shouldDelete) {
      return;
    }

    transactions = transactions.filter((item) => item.id !== data.id);
    saveTransactionsToStorage();
    updateSummary();
    renderTransactions();
  });

  // Attach Edit Event
  // When edit is clicked, fill the form with the selected transaction data
  // and remember which transaction is being edited
  li.querySelector(".btn-edit").addEventListener("click", () => {
    titleInput.value = data.title;
    amountInput.value = data.amount;
    categoryInput.value = data.category;
    dateInput.value = data.date;
    typeInput.value = data.type;

    editingId = data.id;
  });

  return li;
}

function renderTransactions(listToRender = getSortedTransactions()) {
  // Clear the current list before drawing the updated cards
  parentList.innerHTML = "";

  // If there are no transactions at all, show a welcoming empty state
  if (!transactions.length) {
    const emptyState = document.createElement("li");
    emptyState.className = "empty-state";
    emptyState.innerHTML = `
      <h3>No transactions yet</h3>
      <p>Add your first income or expense to get started.</p>
    `;
    parentList.appendChild(emptyState);
    return;
  }

  // If filters leave no transactions visible, show a filtered empty message
  if (!listToRender.length) {
    const emptyState = document.createElement("li");
    emptyState.className = "empty-state";
    emptyState.textContent = "No transactions match the current filters.";
    parentList.appendChild(emptyState);
    return;
  }

  // Render each transaction as a card inside the list container
  listToRender.forEach((transaction) => {
    const card = createTransactionCard(transaction);
    parentList.appendChild(card);
  });
}

function attachFilterListeners() {
  // Search box mein text likhne par filters.searchText update ho jaaye
  filterSearchInput.addEventListener("input", (event) => {
    filters.searchText = event.target.value;
    renderTransactions();
  });

  // Type filter change hone par filters.typeFilter update ho jaaye
  filterTypeSelect.addEventListener("change", (event) => {
    filters.typeFilter = event.target.value;
    renderTransactions();
  });

  // Category filter change hone par filters.categoryFilter update ho jaaye
  filterCategorySelect.addEventListener("change", (event) => {
    filters.categoryFilter = event.target.value;
    renderTransactions();
  });

  // Date filter change hone par filters.dateFilter update ho jaaye
  filterDateInput.addEventListener("change", (event) => {
    filters.dateFilter = event.target.value;
    renderTransactions();
  });

  // Sort option change hone par filters.sortBy update ho jaaye
  sortSelect.addEventListener("change", (event) => {
    filters.sortBy = event.target.value;
    renderTransactions();
  });
}

/* ==========================================================================
   4. FORM SUBMISSION HANDLER
   ========================================================================== */
form.addEventListener("submit", (e) => {
  // Prevent the browser from reloading the page on form submit
  e.preventDefault();

  // Collect form data and trim extra spaces
  const transactionData = {
    title: titleInput.value.trim(),
    amount: Number(amountInput.value),
    category: categoryInput.value.trim(),
    date: dateInput.value.trim(),
    type: typeInput.value.toLowerCase(),
  };

  // Validate the data before saving
  const validationMessage = validateTransactionData(transactionData);
  if (validationMessage) {
    showFormError(validationMessage);
    return;
  }

  clearFormError();

  if (editingId) {
    // Update an existing transaction
    transactions = transactions.map((item) =>
      item.id === editingId ? { ...transactionData, id: editingId } : item
    );
    editingId = null;
  } else {
    // Create a new transaction with a unique id
    const newTransaction = {
      ...transactionData,
      id: Date.now().toString(),
    };
    transactions.push(newTransaction);
  }

  // Save the updated data, refresh the summary, and re-render the UI
  saveTransactionsToStorage();
  updateSummary();
  renderTransactions();

  // Reset the form and clear the error message
  form.reset();
  clearFormError();
});

/* ==========================================================================
   5. INITIAL APPLICATION LOAD
   ========================================================================== */
// Filter listeners ko attach karna zaroori hai taaki UI ke changes se filters update ho sakein
attachFilterListeners();

// Apply the saved theme before rendering the page
applyStoredTheme();

// Render the existing transactions when the page first loads
renderTransactions();

// Show the initial totals from the current transaction data
updateSummary();