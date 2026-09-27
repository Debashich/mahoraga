#pragma once
#include <string>
#include <nlohmann/json.hpp>
#include "Dispatcher.hpp"

class Runtime {
public:
    Runtime(std::unique_ptr<Provider> provider);
    void loadAndExecute(const std::string& jsonContractPath);
    void execute(const nlohmann::json& payload);

private:
    Dispatcher m_dispatcher;
    nlohmann::json m_evidenceBundle;
};