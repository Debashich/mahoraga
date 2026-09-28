#include "Runtime.hpp"
#include <fstream>
#include <iostream>
#include <stdexcept>
#ifdef _WIN32
#include <direct.h>
#else
#include <sys/stat.h>
#include <sys/types.h>
#endif

Runtime::Runtime(std::unique_ptr<Provider> provider) 
    : m_dispatcher(std::move(provider)), m_evidenceBundle(nlohmann::json::array()) {}

void Runtime::execute(const nlohmann::json& payload) {
    std::cout << "=== Odin Runtime Execution ===\n";
    if (payload.contains("module")) {
        std::cout << "Module: " << payload["module"] << "\n\n";
    }

    if (payload.contains("instructions") && payload["instructions"].is_array()) {
        for (const auto& inst : payload["instructions"]) {
            auto result = m_dispatcher.dispatch(inst);
            if (result.contains("data")) {
                m_evidenceBundle.push_back(result);
            }
        }
    } else {
        auto result = m_dispatcher.dispatch(payload);
        if (result.contains("data")) {
            m_evidenceBundle.push_back(result);
        }
    }
    
    // Output Raw Evidence to file
#ifdef _WIN32
    _mkdir("out");
    _mkdir("out/evidence");
#else
    mkdir("out", 0755);
    mkdir("out/evidence", 0755);
#endif
    std::ofstream out("out/evidence/raw_evidence.json");
    out << m_evidenceBundle.dump(4);
    out.close();

    std::cout << "\n=== Execution Complete ===\n";
    std::cout << "Raw evidence written to: out/evidence/raw_evidence.json\n";
}

void Runtime::loadAndExecute(const std::string& jsonContractPath) {
    std::ifstream f(jsonContractPath);
    if (!f.is_open()) throw std::runtime_error("Failed to open instruction contract");

    nlohmann::json payload = nlohmann::json::parse(f);
    execute(payload);
}