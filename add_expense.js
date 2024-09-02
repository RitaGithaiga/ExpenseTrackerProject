document.addEventListener('DOMContentLoaded', () => {
    const addExpenseForm = document.getElementById('add_expense-form');

    addExpenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addExpenseForm);
        const description = formData.get('description');
        const amount = formData.get('amount');
        const date = formData.get('date');
        const category = formData.get('category');

    
        try {
            const response = await fetch('/add_expense', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    description,
                    amount,
                    date, 
                    category})
            });
            if (response.ok) {
                alert('expense added successfully');
                addExpenseForm.reset();

            } else {
                const errorData = await response.json();
                alert('Error');
            }
        } catch (error) {
            console.error('Error:', error);
            alert("error adding the expense")
        }
    });
});