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
    static nlohmann::json collect_users();
    static nlohmann::json collect_auth_logs();
    static nlohmann::json collect_file_metadata();
    static nlohmann::json collect_driver_scan();
    static nlohmann::json collect_registry_hives();

    // Compatibility aliases
    static nlohmann::json collectProcessList() { return collect_process_list(); }
    static nlohmann::json collectNetworkConnections() { return collect_network_connections(); }
    static nlohmann::json collectSystemInfo() { return collect_system_info(); }
    static nlohmann::json collectUsers() { return collect_users(); }
    static nlohmann::json collectAuthLogs() { return collect_auth_logs(); }
    static nlohmann::json collectFileMetadata() { return collect_file_metadata(); }
    static nlohmann::json collectDriverScan() { return collect_driver_scan(); }
    static nlohmann::json collectRegistryHives() { return collect_registry_hives(); }
};