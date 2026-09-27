cmake_policy(SET CMP0135 NEW)
set(CMAKE_POLICY_VERSION_MINIMUM 3.5 CACHE STRING "Minimum policy version" FORCE)
cmake_minimum_required(VERSION 3.14)
project(mahoraga CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)
FetchContent_Declare(json URL https://github.com/nlohmann/json/releases/download/v3.11.2/json.tar.xz)
FetchContent_MakeAvailable(json)

if(WIN32)
    add_executable(mahoraga-run
        runtime/main.cpp
        runtime/core/Runtime.cpp
        runtime/core/Dispatcher.cpp
        runtime/providers/windows/WindowsProvider.cpp
    )
    target_link_libraries(mahoraga-run PRIVATE nlohmann_json iphlpapi ws2_32)
else()
    add_executable(mahoraga-run
        runtime/main.cpp
        runtime/core/Runtime.cpp
        runtime/core/Dispatcher.cpp
        runtime/providers/linux/LinuxProvider.cpp
    )
    target_link_libraries(mahoraga-run PRIVATE nlohmann_json)
endif()

target_include_directories(mahoraga-run PRIVATE runtime)