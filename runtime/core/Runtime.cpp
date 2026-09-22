#include "Runtime.hpp"
#include <fstream>
#include <iostream>
#include <stdexcept>

Runtime::Runtime(std::unique_ptr<Provider> provider) 
    : m_dispatcher(std::move(provider)), m_evidenceBundle(nlohmann::json::array()) {}

void Runtime::loadAndExecute(const std::string& jsonContractPath) {
    std::ifstream f(jsonContractPath);
    if (!f.is_open()) {
        throw std::runtime_error("Failed to open instruction contract");
    }

    nlohmann::json payload = nlohmann::json::parse(f);
    std::cout << "=== Odin Runtime Execution ===\n";
    std::cout << "Module: " << payload["module"] << "\n\n";

    for (const auto& inst : payload["instructions"]) {
        auto result = m_dispatcher.dispatch(inst);
        if (result.contains("data")) {
            m_evidenceBundle.push_back(result);
        }
    }
    
    std::cout << "\n=== Execution Complete ===\n";
    std::cout << "Collected Evidence Items: " << m_evidenceBundle.size() << "\n";
    // For verification, print a sample of the first array's size
    if (!m_evidenceBundle.empty()) {
        std::cout << "Sample payload (0) row count: " << m_evidenceBundle[0]["data"].size() << "\n";
    }
}