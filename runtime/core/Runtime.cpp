#include "Runtime.hpp"
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <filesystem>

Runtime::Runtime(std::unique_ptr<Provider> provider) 
    : m_dispatcher(std::move(provider)), m_evidenceBundle(nlohmann::json::array()) {}

void Runtime::loadAndExecute(const std::string& jsonContractPath) {
    std::ifstream f(jsonContractPath);
    if (!f.is_open()) throw std::runtime_error("Failed to open instruction contract");

    nlohmann::json payload = nlohmann::json::parse(f);
    std::cout << "=== Odin Runtime Execution ===\n";
    std::cout << "Module: " << payload["module"] << "\n\n";

    for (const auto& inst : payload["instructions"]) {
        auto result = m_dispatcher.dispatch(inst);
        if (result.contains("data")) {
            m_evidenceBundle.push_back(result);
        }
    }
    
    // Output Raw Evidence to file
    std::filesystem::create_directories("out/evidence");
    std::ofstream out("out/evidence/raw_evidence.json");
    out << m_evidenceBundle.dump(4);
    out.close();

    std::cout << "\n=== Execution Complete ===\n";
    std::cout << "Raw evidence written to: out/evidence/raw_evidence.json\n";
}