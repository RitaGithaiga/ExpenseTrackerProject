document.addEventListener('DOMContentLoaded', () => {
    const filterForm = document.getElementById('filter-form');
    const tableBody = document.querySelector('#expense-table tbody');

    // Function to add a new row to the table
    function addRow(expense) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${expense.description}</td>
            <td>${expense.date}</td>
            <td>${parseFloat(expense.amount).toFixed(2)}</td>
            <td>${expense.category}</td>
        `;
        tableBody.appendChild(row);
    }

    // Handle filtering expenses by date
    filterForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent form from submitting the traditional way
        const date = filterForm['filter-date'].value;

        // Fetch expenses from the server with the provided date filter
        const response = await fetch(`/expenses?date=${date}`);
        if (response.ok) {
            const expenses = await response.json();
            tableBody.innerHTML = ''; // Clear existing rows
            expenses.forEach(addRow);
        } else {
            console.error('Failed to fetch expenses');
        }
    });

    // Optionally, load initial data or a default set of expenses
    (async function loadInitialExpenses() {
        const response = await fetch('/expenses');
        if (response.ok) {
            const expenses = await response.json();
            expenses.forEach(addRow);
        } else {
            console.error('Failed to fetch initial expenses');
        }
    })();
});
