function generateXAuthHeaderValue(password) {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, ''); 
    const data = `${password}_${timestamp}`;
    return md5(data);
}

function md5(str) {
    return CryptoJS.MD5(str).toString();
}

const apiUrl = 'http://api.valantis.store:40000';
const password = 'Valantis'; 

const xAuthHeaderValue = generateXAuthHeaderValue(password);
   
async function getIds(pageNumber,limit) {
    const requestData = {
        action: 'get_ids',
        params: {
            offset: (pageNumber - 1) * 50,
            limit: limit
        }
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Auth':xAuthHeaderValue},
        body: JSON.stringify(requestData)
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();

    const result = responseData.result;

    return  result;}

async function getItems(arIds){
    const requestData = {
        action: 'get_items',
        params: {
            "ids":arIds 
        }
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Auth':xAuthHeaderValue},
        body: JSON.stringify(requestData)
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData.result;
}
async function getFields( field, offset=3, limit=5) {
    let requestData={}
    if(field){ requestData = {
        action: 'get_fields',
        params: {
            field: field,
            offset: offset,
            limit: limit
        }
    };}else{
        requestData = {
            action: 'get_fields',
        };
    }
    

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth': xAuthHeaderValue
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData.result;
    } catch (error) {
        console.error('Error fetching fields:', error);
        throw error;
    }
}
async function filterItems (value, field){
   
    let requestData = {
        action: 'filter',
        params: {}
    };
    
    if (field === 'price') {
        requestData.params.price = Number(value);
    } else {
        requestData.params[field] = value;
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Auth':xAuthHeaderValue},
        body: JSON.stringify(requestData)
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData.result;
}


document.addEventListener('DOMContentLoaded', async function () {
    let content = document.querySelector('.content');
    const itemsPerPage = 50;
    let currentPage = 0;
    let allAr = []; 
    let length = 0;
    let allFields =[];

    async function loadData() {
        let ar = await getIds();
        length = Array.from(ar).length
        console.log(length)
        let result = [];
        result = await getItems(ar); 
        console.log(result);
        const seen = new Set();
        const unique = result.filter(item => {
          const duplicate = seen.has(item.id);
          seen.add(item.id);
          return !duplicate;
        });
        allAr = unique || [];
        let a = await getFields();
        allFields = Array.from(a)
    }

     function showPage(page) {
        console.log(allFields);
        const startIndex = page * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const seen = new Set();
        const unique = allAr.filter(item => {
          const duplicate = seen.has(item.id);
          seen.add(item.id);
          return !duplicate;
        });

        const items = unique.slice(startIndex, endIndex);
       
        content.innerHTML = "";
        console.log(items)
        items.forEach(item => {
            content.innerHTML += `<li>${item.id}, ${item.product}, ${item.price}, ${item.brand}</li>`;
        });
    }

    function createSelectFields(){
        let defaultOption = document.createElement('option');
        defaultOption.textContent = "Choose an option";
        let selectedOption=""
        let selectContainer = document.createElement('select');
        selectContainer.classList.add('select');
        let selectTag = document.body.appendChild(selectContainer);
        let inputContainer = document.createElement('input');
        let inputTag = document.body.appendChild(inputContainer);
        
        let buttonEl = document.createElement('button');
        document.body.appendChild(buttonEl);
        buttonEl.classList.add('btn');
        buttonEl.textContent = "Filter"
        let outputArea = document.createElement('ul');
        document.body.appendChild(outputArea);
       
        selectTag.appendChild(defaultOption);

        for (let i = 0; i < allFields.length; i++){
            const field = document.createElement('option');
            field.setAttribute('value', allFields[i]);
            field.textContent = allFields[i];
            selectTag.appendChild(field);
        }
    
        selectContainer.addEventListener("change", async () => {
            selectedOption = selectContainer.value;
            inputTag.value = ''; 
            outputArea.innerHTML=""
        });

        buttonEl.addEventListener('click',async ()=>{
            let arIds = await filterItems(inputTag.value,selectedOption);
            let uniq = [...new Set(arIds)]
            allAr = await getItems(Array.from(uniq))
            content.innerHTML = "";
            const element = document.querySelector(".pagination");
            element.remove();
            await showPage(currentPage);
            createPageButtons();
        })
    
        inputTag.addEventListener("input", () => {
            let inputValue = inputTag.value;
            let isValidInput = validateInput(selectedOption, inputValue);
            if (!isValidInput) {
                inputTag.value = ''; 
            }
        });
    }
    function validateInput(selectedOption, inputValue) {
        if (selectedOption === 'brand') {
            let regex = /^[a-zA-Z0-9\s]*$/;
            return regex.test(inputValue);
        } if(selectedOption === 'product'){
            let regex = /^[a-zA-Z0-9а-яА-Я\s]*$/;
            return regex.test(inputValue);
        }
        else{
            let regex = /^\d+(\.\d{1,2})?$/;
            return regex.test(inputValue);
        } 
    }
    function createPageButtons() {
        let paginationContainer = document.createElement('div');
        paginationContainer.classList.add('pagination');
        let paginationDiv = document.body.appendChild(paginationContainer);
        const totalPages = Math.ceil(allAr.length / itemsPerPage);
        
        for (let i = 0; i < totalPages; i++)  {
            const pageButton = document.createElement('button');
            pageButton.textContent = i + 1;
            pageButton.addEventListener("click",  () => {
                console.log("Page button clicked:", i);
                currentPage = i;
                updateActiveButtonStates();
                 showPage(currentPage);
                
            });
            paginationDiv.appendChild(pageButton);
        }
    }
    
    function updateActiveButtonStates() {
        const pageButtons = document.querySelectorAll('.pagination button');
        pageButtons.forEach((button, index) => {
            if (index === currentPage) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
    
    await loadData();
    createSelectFields();
    createPageButtons();
    
    await showPage(currentPage);
});
