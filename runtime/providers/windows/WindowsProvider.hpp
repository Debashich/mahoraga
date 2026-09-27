#pragma once

#include "../common/Provider.hpp"
#include <nlohmann/json.hpp>
#include <string>
#include <vector>

class WindowsProvider : public Provider {
public:
    bool supports(const std::string& operation) const override;
    std::vector<std::string> capabilities() const override;
    nlohmann::json execute(const std::string& operation) override;

    static nlohmann::json collect_process_list();
    static nlohmann::json collect_network_connections();
    static nlohmann::json collect_system_info();

    // Compatibility aliases
    static nlohmann::json collectProcessList() { return collect_process_list(); }
    static nlohmann::json collectNetworkConnections() { return collect_network_connections(); }
    static nlohmann::json collectSystemInfo() { return collect_system_info(); }
};