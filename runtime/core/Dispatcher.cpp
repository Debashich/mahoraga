#include "Dispatcher.hpp"
#include <stdexcept>
#include <iostream>

Dispatcher::Dispatcher(std::unique_ptr<Provider> provider) 
    : m_provider(std::move(provider)) {}

nlohmann::json Dispatcher::dispatch(const nlohmann::json& instruction) {
    std::string type = instruction["type"];
    
    if (type == "collect") {
        std::string op = instruction["operation"];
        if (!m_provider->supports(op)) {
            throw std::runtime_error("Operation unsupported by active provider: " + op);
        }
        std::cout << "[Dispatcher] Executing collection: " << op << "\n";
        
        // Wrap output in Canonical Evidence Schema struct wrapper
        nlohmann::json result = {
            {"canonical_type", "evidence_" + op},
            {"data", m_provider->execute(op)}
        };
        return result;
    }
    else if (type == "correlate" || type == "emit") {
        std::cout << "[Dispatcher] Handling structural op: " << type << "\n";
        return {{"status", "success"}};
    }
    
    throw std::runtime_error("Unknown instruction type");
}