const http = require("http");

function makeRequest(query) {
    return new Promise((resolve) => {
        http.get(`http://127.0.0.1:8000/search?q=${encodeURIComponent(query)}`, (res) => {
            let body = "";
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                console.log(`\n--- Python AI Search for: "${query}" ---`);
                console.log("Status Code:", res.statusCode);
                try {
                    const data = JSON.parse(body);
                    console.log("Success:", data.success);
                    console.log("Corrected Query:", data.corrected_query);
                    console.log("Results count:", data.results?.length);
                    console.log("Top matches:", data.results?.slice(0, 3));
                } catch (e) {
                    console.log("Raw body:", body);
                }
                resolve();
            });
        });
    });
}

async function run() {
    await makeRequest("sliper");
    await makeRequest("child wear");
}

run();
